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

function metricNameToTitle(metricName, extraMetadata) {
    return extraMetadata.metrics[metricName].title || metricName;
}

function metricNamesToTitles(metricNames, extraMetadata) {
    return metricNames.map(mn => metricNameToTitle(mn, extraMetadata));
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
        dataset.addSummaryMetrics(
            metricNamesToTitles(manifest.extraMetadata.summaryMetrics, manifest.extraMetadata),
        );
    }

    // Add sections to dataset object if they have been defined
    const sectioned = manifest.extraMetadata.dashboard.sectioned;
    if (sectioned) {
        manifest.extraMetadata.dashboard.sections.forEach(sectionMeta => {
            const title = sectionMeta.title;
            const key = sectionTitleToKey(title);
            dataset.addSection(new Section(key, title));
        });
    }

    if (manifest.sources.annotations) {
        request(manifest.sources.annotations, (error, response, body) => processCategories(body));
    } else {
        processCategories();
    }

    function getSectionTitle(metricName) {
        if (manifest.extraMetadata.dashboard.sections) {
            const sectionMeta = manifest.extraMetadata.dashboard.sections.find(sectionMeta => {
                return sectionMeta.metrics.includes(metricName);
            });

            if (sectionMeta) {
                return sectionTitleToKey(sectionMeta.title);
            }
        }
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
                metricsToShow.forEach(metricName => {
                    const metricMeta = manifest.extraMetadata.metrics[metricName];
                    const metricType = metricMeta.type;

                    const metric = dataset.getMetric(
                        metricNameToTitle(metricName, manifest.extraMetadata),
                        metricMeta.description,
                        metricType,
                        metricMeta.axes,
                        metricMeta.columns,
                        getSectionTitle(metricName),
                    );

                    // If this metric is not in this entry, do nothing else. We need
                    // to call getMetric() before bailing out here, otherwise the
                    // ordering of metrics would be messed up in the final output.
                    if (!propertyExists(entry.metrics, metricName)) return;

                    const categoryData = metric.getCategoryData(categoryName);

                    // Add annotations if any
                    if (sourceAnnotations) {
                        sourceAnnotations[categoryName].forEach(sa => {
                            if (propertyExists(sa.annotation, metricName)) {
                                const annotations = metric.getCategoryAnnotations(categoryName);
                                annotations.addAnnotation(sa.date, sa.annotation[metricName]);
                            }
                        });
                    }

                    if (metricType === 'line') {

                        // If the source dataset doesn't specify any populations, create
                        // one "default" population.
                        let populations;
                        const multiplePopulations = typeof(entry.metrics[metricName]) === 'object';
                        if (multiplePopulations) {
                            populations = Object.keys(entry.metrics[metricName]);
                        } else {
                            populations = ['default'];
                        }

                        // For each population NAME
                        populations.forEach(populationName => {
                            const population = categoryData.getPopulation(populationName);
                            const yValue = multiplePopulations ? entry.metrics[metricName][populationName] : entry.metrics[metricName];
                            const dataPoint = new DataPoint(entry.date, yValue);
                            population.addDataPoint(dataPoint);
                        }); // For each population NAME

                    } else if (metricType === 'table') {
                        // For each row NAME
                        Object.keys(entry.metrics[metricName]).map(rowName => {
                            const tableSnapshot = categoryData.getTableSnapshot(entry.date);
                            const row = new Row(rowName, entry.metrics[metricName][rowName]);
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

        this.version = '0.0.2';
        this.metrics = {};
        this.sections = [];
        this.categoryNames = [];
    }

    addSummaryMetrics(summaryMetrics) {
        this.summaryMetrics = summaryMetrics;
    }

    getMetric(title, description, type, axes, columns, section) {
        if (!propertyExists(this.metrics, title)) {
            this.metrics[title] = new Metric(title, description, type, axes, columns, section);
        }
        return this.metrics[title];
    }

    addSection(section) {
        this.sections.push(section);
    }

    addCategoryName(categoryName) {
        this.categoryNames.push(categoryName);
    }

    render() {
        let renderedMetrics = [];

        Object.keys(this.metrics).forEach(metricTitle => {
            renderedMetrics.push(this.metrics[metricTitle].render());
        });

        const output = {
            title: this.title,
            version: this.version,
            description: this.description,
            metrics: renderedMetrics,
            categories: this.categoryNames,
            defaultCategory: this.defaultCategory,
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
    constructor(title, description, type, axes, columns, section) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.axes = axes;
        this.columns = columns;
        this.section = section;

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
            section: this.section,
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
    constructor(key, title) {
        this.key = key;
        this.title = title;
    }

    render() {
        return {
            key: this.key,
            title: this.title,
        };
    }
}
