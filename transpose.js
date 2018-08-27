const fs = require('fs');
const request = require('request');


module.exports = (manifest, callback) => {
    if (isURL(manifest.sources.data)) {
        request(manifest.sources.data, (error, response, body) => processData(error, body, manifest, callback));
    } else {
        fs.readFile(manifest.sources.data, 'utf8', (error, body) => processData(error, body, manifest, callback));
    }
}

function isURL(str) {
    return str.startsWith('http');
}

function propertyExists(obj, property) {
    return property in obj;
}

function objectIsEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function metricSlugToTitle(metricSlug, extraMetadata) {
    return extraMetadata.metrics[metricSlug].title || metricSlug;
}

function processData(error, dataBody, manifest, callback) {
    if (error) {
        return callback({
            error: `Error getting ${manifest.sources.data}`,
        });
    }

    const sourceData = JSON.parse(dataBody);
    const dataset = new Dataset(
        manifest.extraMetadata.title,
        manifest.extraMetadata.description,
        manifest.extraMetadata.defaultCategory,
    );

    if (manifest.extraMetadata.summaryMetrics) {
        dataset.addSummaryMetrics(manifest.extraMetadata.summaryMetrics);
    }

    // Add sections to dataset object if they have been defined
    const sectioned = manifest.extraMetadata.dashboard.sectioned;
    if (sectioned) {
        manifest.extraMetadata.dashboard.sections.forEach(sectionMeta => {
            const key = sectionTitleToKey(sectionMeta.title);
            dataset.addSection(new Section(key, sectionMeta.title, sectionMeta.metrics));
        });
    }

    if (manifest.sources.annotations) {
        request(manifest.sources.annotations, (error, response, body) => processCategories(body));
    } else {
        processCategories();
    }

    function sectionTitleToKey(sectionTitle) {
        return sectionTitle.replace(' ', '').toLowerCase();
    }

    function processCategories(annotationsBody) {
        let sourceAnnotations;

        if (annotationsBody) {
            sourceAnnotations = JSON.parse(annotationsBody);
        }

        // For each category NAME, where a category looks like:
        //
        // "US": {...}
        Object.keys(sourceData).forEach(categoryName => {
            dataset.addCategoryName(categoryName);

            // For each entry OBJECT in that category, where an entry looks like:
            //
            // {
            //     "date": "2018-01-01",
            //     "metrics": {...}
            // }
            sourceData[categoryName].forEach(entry => {
                dataset.addDate(entry.date);

                let metricsToShow;
                if (sectioned) {
                    metricsToShow = manifest.extraMetadata.dashboard.sections.reduce((acc, sectionMeta) => {
                        return acc.concat(sectionMeta.metrics);
                    }, []);
                } else {
                    metricsToShow = manifest.extraMetadata.dashboard.metrics;
                }

                // For each metric NAME to show:
                //
                // (By consequence, anything not named in the "dashboards" portion
                // of the manifest will not be part of the final output. Also, the
                // ordering of the final output will match the ordering of metrics
                // in the manifest.)
                metricsToShow.forEach(metricSlug => {
                    const metricMeta = manifest.extraMetadata.metrics[metricSlug];
                    const metricType = metricMeta.type;

                    const metric = dataset.getMetric(
                        metricSlug,
                        metricSlugToTitle(metricSlug, manifest.extraMetadata),
                        metricMeta.description,
                        metricType,
                        metricMeta.axes,
                        metricMeta.columns,
                    );

                    // If this metric is not in this entry, do nothing else. We need
                    // to call getMetric() before bailing out here, otherwise the
                    // ordering of metrics would be messed up in the final output.
                    if (!propertyExists(entry.metrics, metricSlug)) return;

                    const categoryData = metric.getCategoryData(categoryName);

                    // Add annotations if any
                    if (sourceAnnotations) {
                        sourceAnnotations[categoryName].forEach(sa => {
                            if (propertyExists(sa.annotation, metricSlug)) {
                                const annotations = metric.getCategoryAnnotations(categoryName);
                                annotations.addAnnotation(sa.date, sa.annotation[metricSlug]);
                            }
                        });
                    }

                    if (metricType === 'line') {

                        // If the source dataset doesn't specify any populations, create
                        // one "default" population.
                        let populations;
                        const multiplePopulations = typeof(entry.metrics[metricSlug]) === 'object';
                        if (multiplePopulations) {
                            populations = Object.keys(entry.metrics[metricSlug]);
                        } else {
                            populations = ['default'];
                        }

                        // For each population NAME
                        populations.forEach(populationName => {
                            const population = categoryData.getPopulation(populationName);
                            const yValue = multiplePopulations ? entry.metrics[metricSlug][populationName] : entry.metrics[metricSlug];
                            const dataPoint = new DataPoint(entry.date, yValue);
                            population.addDataPoint(dataPoint);
                        }); // For each population NAME

                    } else if (metricType === 'table') {
                        // For each row NAME
                        Object.keys(entry.metrics[metricSlug]).map(rowName => {
                            const tableSnapshot = categoryData.getTableSnapshot(entry.date);
                            const row = new Row(rowName, entry.metrics[metricSlug][rowName]);
                            tableSnapshot.addRow(row);
                        }); // For each row NAME
                    }

                }); // For each metric NAME

            }); // For each entry OBJECT

        }); // For each category NAME

        callback(dataset.render());

    } // processCategories
}

class Dataset {
    constructor(title, description, defaultCategory) {
        this.title = title;
        this.description = description;
        this.defaultCategory = defaultCategory;
        this.dates = new Set();

        this.apiVersion = '1.0.0';
        this.metrics = {};
        this.sections = [];
        this.categoryNames = [];
    }

    addSummaryMetrics(summaryMetrics) {
        this.summaryMetrics = summaryMetrics;
    }

    getMetric(slug, title, description, type, axes, columns) {
        if (!propertyExists(this.metrics, slug)) {
            this.metrics[slug] = new Metric(title, description, type, axes, columns);
        }
        return this.metrics[slug];
    }

    addSection(section) {
        this.sections.push(section);
    }

    addCategoryName(categoryName) {
        this.categoryNames.push(categoryName);
    }

    addDate(date) {
        this.dates.add(date);
    }

    render() {
        let renderedMetrics = {};

        Object.keys(this.metrics).forEach(metricSlug => {
            renderedMetrics[metricSlug] = this.metrics[metricSlug].render();
        });

        const output = {
            title: this.title,
            description: this.description,
            dates: Array.from(this.dates).sort(),
            metrics: renderedMetrics,
            categories: this.categoryNames,
            defaultCategory: this.defaultCategory,
            apiVersion: this.apiVersion,
        };

        if (this.sections.length > 0) {
            output.sections = this.sections.map(s => s.render());
        }

        if (this.summaryMetrics) {
            output.summaryMetrics = this.summaryMetrics;
        }

        return output;
    }
}

class Metric {
    constructor(title, description, type, axes, columns) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.axes = axes;
        this.columns = columns;

        this.dataByCategory = {};
        this.annotationsByCategory = {};
    }

    getCategoryData(categoryName) {
        if (!propertyExists(this.dataByCategory, categoryName)) {
            this.dataByCategory[categoryName] = new CategoryData();
        }
        return this.dataByCategory[categoryName];
    }

    getCategoryAnnotations(categoryName) {
        if (!propertyExists(this.annotationsByCategory, categoryName)) {
            this.annotationsByCategory[categoryName] = new CategoryAnnotations();
        }
        return this.annotationsByCategory[categoryName];
    }

    render() {
        const renderedDataByCategory = {};
        Object.keys(this.dataByCategory).forEach(categoryName => {
            renderedDataByCategory[categoryName] = this.dataByCategory[categoryName].render();
        });

        const output = {
            title: this.title,
            description: this.description,
            type: this.type,
            data: renderedDataByCategory,
        };

        if (!objectIsEmpty(this.annotationsByCategory)) {
            const renderedAnnotationsByCategory = {};
            Object.keys(this.annotationsByCategory).forEach(categoryName => {
                renderedAnnotationsByCategory[categoryName] = this.annotationsByCategory[categoryName].render();
            });
            output.annotations = renderedAnnotationsByCategory;
        }

        if (this.axes && !objectIsEmpty(this.axes)) {
            output.axes = this.axes;
        } else if (this.columns && !objectIsEmpty(this.columns)) {
            output.columns = this.columns;
        }

        return output;
    }
}

class CategoryData {
    constructor() {
        this.populations = {};
        this.tableSnapshots = {};
    }

    getPopulation(populationName) {
        if (!propertyExists(this.populations, populationName)) {
            this.populations[populationName] = new Population(populationName);
        }
        return this.populations[populationName];
    }

    getTableSnapshot(date) {
        if (!propertyExists(this.tableSnapshots, date)) {
            this.tableSnapshots[date] = new TableSnapshot();
        }
        return this.tableSnapshots[date];
    }

    render() {
        const output = {};

        if (!objectIsEmpty(this.populations)) {
            const renderedPopulations = {};
            Object.keys(this.populations).forEach(populationName => {
                renderedPopulations[populationName] = this.populations[populationName].render();
            });
            output.populations = renderedPopulations;
        } else if (!objectIsEmpty(this.tableSnapshots)) {
            output.dates = this.tableSnapshots;
        }

        return output;
    }
}

class CategoryAnnotations {
    constructor() {
        this.annotations = {};
    }

    addAnnotation(date, label) {
        this.annotations[date] = label;
    }

    render() {
        return Object.keys(this.annotations).map(date => {
            return { date, label: this.annotations[date] };
        });
    }
}


class Population {
    constructor(name) {
        this.name = name;

        this.dataPoints = [];
    }

    addDataPoint(dataPoint) {
        this.dataPoints.push(dataPoint);
    }

    render() {
        return this.dataPoints.map(dp => dp.render());
    }
}

class TableSnapshot {
    constructor() {
        this.rows = [];
    }

    addRow(row) {
        this.rows.push(row);
    }

    render() {
        return this.rows.map(row => row.render());
    }
}

class DataPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    render() {
        return {
            x: this.x,
            y: this.y,
        };
    }
}

class Row {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    render() {
        return {
            name: this.name,
            value: this.value,
        };
    }
}

class Section {
    constructor(key, title, metrics) {
        this.key = key;
        this.title = title;
        this.metrics = metrics;
    }

    render() {
        return {
            key: this.key,
            title: this.title,
            metrics: this.metrics,
        };
    }
}
