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

function processSource(error, body, manifest, callback) {
    if (error) {
        return callback({
            error: `Error getting ${manifest.source}`,
        });
    }

    function getSectionTitle(metricName) {
        if (manifest.extraMetadata.sections) {
            const sectionMeta = manifest.extraMetadata.sections.find(sectionMeta => {
                return sectionMeta.charts.includes(metricName);
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
    const dataset = new Dataset(manifest.extraMetadata.title, manifest.extraMetadata.description);

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

        // For each entry OBJECT in that category, where an entry looks like:
        //
        // {
        //     "date": "2018-01-01",
        //     "metrics": {...}
        // }
        source[categoryName].forEach(entry => {

            // For each metric NAME in that entry, where a metric looks like:
            //
            // "YAU": 1000
            //
            // OR
            //
            // "Operating System": {
            //     "Windows": 1000,
            //     "Mac": 1000
            // }
            Object.keys(entry.metrics).forEach(metricName => {
                const chartMeta = manifest.extraMetadata.charts[metricName];
                const chartTitle = chartMeta.title || metricName;
                const chartDescription = chartMeta.description;
                const chartSection = chartMeta.section;
                const chartUnits = chartMeta.units;

                const chart = dataset.getChart(chartTitle, chartDescription, chartSection, chartUnits);
                const category = chart.getCategory(categoryName);

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

            }); // For each metric NAME

        }); // For each entry OBJECT

    }); // For each category NAME

    callback(dataset.render());
}

class Dataset {
    constructor(title, description) {
        this.title = title;
        this.description = description;

        this.version = '0.0.2';
        this.charts = {};
        this.sections = [];
    }

    getChart(title, description, section, units) {
        if (!propertyExists(this.charts, title)) {
            this.charts[title] = new Chart(title, description, section, units);
        }
        return this.charts[title];
    }

    addSection(section) {
        this.sections.push(section);
    }

    render() {
        let renderedCharts = [];

        Object.keys(this.charts).forEach(chartTitle => {
            renderedCharts.push(this.charts[chartTitle].render());
        });

        const output = {
            title: this.title,
            version: this.version,
            description: this.description,
            charts: renderedCharts,
        };

        if (this.sections.length > 0) {
            output.sections = this.sections.map(s => s.render());
        }

        return output;
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

class Chart {
    constructor(title, description, section, units) {
        this.title = title;
        this.description = description;
        this.section = section;
        this.units = units;

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

        return {
            title: this.title,
            description: this.description,
            section: this.section,
            units: this.units,
            categories: renderedCategories,
        };
    }
}

class Category {
    constructor(name) {
        this.name = name;

        this.populations = {};
    }

    getPopulation(populationName) {
        if (!propertyExists(this.populations, populationName)) {
            this.populations[populationName] = new Population(populationName);
        }
        return this.populations[populationName];
    }

    render() {
        const renderedPopulations = {};

        Object.keys(this.populations).forEach(populationName => {
            renderedPopulations[populationName] = this.populations[populationName].render();
        });

        return {
            populations: renderedPopulations,
        }
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
