import fs from 'fs';
import request from 'request';
import decimal from 'decimal';


export default (manifest, callback) => {
    if (isURL(manifest.source)) {
        request(manifest.source, (error, response, body) => processSource(error, body, manifest, callback));
    } else {
        fs.readFile(manifest.source, 'utf8', (error, body) => processSource(error, body, manifest, callback));
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

function processSource(error, body, manifest, callback) {
    if (error) {
        return callback({
            error: `Error getting ${manifest.source}`,
        });
    }

    function getSectionTitle(metricName) {
        if (manifest.extraMetadata.sections) {
            const sectionMeta = manifest.extraMetadata.sections.find(sectionMeta => {
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

    const source = JSON.parse(body);
    const dataset = new Dataset(manifest.extraMetadata.title, manifest.extraMetadata.description, manifest.extraMetadata.defaultCategory);

    // Add sections to dataset object
    if (manifest.extraMetadata.sections) {
        manifest.extraMetadata.sections.forEach(sectionMeta => {
            const title = sectionMeta.title;
            const key = sectionTitleToKey(title);
            dataset.addSection(new Section(key, title));
        });
    }

    // For each category NAME, where a category looks like:
    //
    // "US": {...}
    Object.keys(source).forEach(categoryName => {
        dataset.addCategoryName(categoryName);

        // For each entry OBJECT in that category, where an entry looks like:
        //
        // {
        //     "date": "2018-01-01",
        //     "metrics": {...}
        // }
        source[categoryName].forEach(entry => {

            // For each metric NAME in the manifest:
            //
            // (By consequence, anything not named in the manifest will not be
            // part of the final output. Also, the ordering of metrics in the
            // final output should mirror the ordering of metrics in the
            // manifest, although object ordering in JavaScript isn't
            // gauranteed.)
            Object.keys(manifest.extraMetadata.metrics).forEach(metricName => {
                // If this metric is not in this entry, do nothing.
                if (!propertyExists(entry.metrics, metricName)) return;

                const metricMeta = manifest.extraMetadata.metrics[metricName];
                const metricType = metricMeta.type;

                const metric = dataset.getMetric(
                    metricMeta.title || metricName,
                    metricMeta.description,
                    metricType,
                    metricMeta.axes,
                    metricMeta.columns,
                    getSectionTitle(metricName),
                );

                const category = metric.getCategory(categoryName);

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
                        const population = category.getPopulation(populationName);
                        const yValue = multiplePopulations ? entry.metrics[metricName][populationName] : entry.metrics[metricName];
                        const dataPoint = new DataPoint(entry.date, yValue);
                        population.addDataPoint(dataPoint);
                    }); // For each population NAME

                } else if (metricType === 'table') {
                    // For each row NAME
                    Object.keys(entry.metrics[metricName]).map(rowName => {
                        const tableSnapshot = category.getTableSnapshot(entry.date);
                        const row = new Row(rowName, entry.metrics[metricName][rowName]);
                        tableSnapshot.addRow(row);
                    }); // For each row NAME
                }

            }); // For each metric NAME

        }); // For each entry OBJECT

    }); // For each category NAME

    callback(dataset.render());
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

        this.categories = {};
    }

    getCategory(categoryName) {
        if (!propertyExists(this.categories, categoryName)) {
            this.categories[categoryName] = new Category(categoryName);
        }
        return this.categories[categoryName];
    }

    render() {
        const renderedCategories = {};
        Object.keys(this.categories).forEach(categoryName => {
            renderedCategories[categoryName] = this.categories[categoryName].render();
        });

        const output = {
            title: this.title,
            description: this.description,
            type: this.type,
            section: this.section,
            categories: renderedCategories,
        };

        if (this.axes && !objectIsEmpty(this.axes)) {
            output.axes = this.axes;
        } else if (this.columns && !objectIsEmpty(this.columns)) {
            output.columns = this.columns;
        }

        return output;
    }
}

class Category {
    constructor(name) {
        this.name = name;

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
