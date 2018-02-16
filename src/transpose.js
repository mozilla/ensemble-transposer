import request from 'request';
import decimal from 'decimal';


export default (manifest, callback) => {
    request(manifest.source, (error, response, body) => {
        if (error) {
            return callback({
                error: `Error getting ${manifest.source}`,
            });
        }

        const dataset = new Dataset(manifest.extraMetadata.title, manifest.extraMetadata.description);
        const charts = {};
        const populations = {};

        const source = JSON.parse(body);

        function getSectionTitle(metricName) {
            return sectionTitleToKey(manifest.extraMetadata.sections.find(sectionMeta => {
                return sectionMeta.charts.includes(metricName);
            }).title);
        }

        function sectionTitleToKey(sectionTitle) {
            return sectionTitle.replace(' ', '').toLowerCase();
        }

        function newChart(metricName) {
            const chartMeta = manifest.extraMetadata.charts[metricName];

            const title = chartMeta.title;
            const description = chartMeta.description;
            const section = getSectionTitle(metricName);
            const units = chartMeta.units;

            return new Chart(title, description, section, units);
        }

        // Add sections to dataset object
        manifest.extraMetadata.sections.forEach(sectionMeta => {
            const title = sectionMeta.title;
            const key = sectionTitleToKey(title);
            dataset.addSection(new Section(key, title));
        });

        // For each entry in the dataset...
        source.data.forEach(entry => {

            // For each metric in that entry...
            // https://stackoverflow.com/a/18202926/4297741
            Object.keys(entry.metrics).forEach(metricName => {
                if (!(metricName in charts)) {
                    charts[metricName] = newChart(metricName);
                    dataset.addChart(charts[metricName]);
                }

                // For each popultaion in that metric...
                Object.keys(entry.metrics[metricName]).forEach(populationName => {
                    if (!(metricName in populations)) {
                        populations[metricName] = {};
                    }

                    if (!(populationName in populations[metricName])) {
                        populations[metricName][populationName] = new Population(populationName);
                        charts[metricName].addPopulation(populations[metricName][populationName]);
                    }

                    // Avoid artifacts from floating point arithmetic when multiplying by 100
                    const yValue = decimal(
                        entry.metrics[metricName][populationName]
                    ).mul(100).toNumber();

                    const dataPoint = new DataPoint(entry.date, yValue);

                    populations[metricName][populationName].addDataPoint(dataPoint);
                });
            });
        });

        callback(dataset.render());
    });
}

class Dataset {
    constructor(title, description) {
        this.title = title;
        this.description = description;

        this.version = '0.0.2';
        this.charts = [];
        this.sections = [];
    }

    addChart(chart) {
        this.charts.push(chart);
    }

    addSection(section) {
        this.sections.push(section);
    }

    render() {
        return {
            title: this.title,
            version: this.version,
            description: this.description,
            sections: this.sections.map(s => s.render()),
            charts: this.charts.map(c => c.render()),
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

class Chart {
    constructor(title, description, section, units) {
        this.title = title;
        this.description = description;
        this.section = section;
        this.units = units;

        this.populations = {};
    }

    addPopulation(population) {
        this.populations[population.getName()] = population;
    }

    render() {
        const renderedPopulations = {};

        Object.keys(this.populations).forEach(populationName => {
            renderedPopulations[populationName] = this.populations[populationName].render();
        });

        return {
            title: this.title,
            description: this.description,
            section: this.section,
            units: this.units,
            populations: renderedPopulations,
        };
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

    getName() {
        return this.name;
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
