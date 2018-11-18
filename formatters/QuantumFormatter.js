const Formatter = require('./Formatter');


module.exports = class extends Formatter {
    constructor(...args) {
        super(...args);
        this.apiVersion = '1.0.0';
    }

    getSummary() {
        const summary = {};

        summary.title = this.config.options.title;
        summary.description = this.config.options.description;
        summary.categories = Object.keys(this.rawData);

        if (this.config.options.defaultCategory) {
            summary.defaultCategory = this.config.options.defaultCategory;
        }

        summary.metrics = Object.keys(this.config.options.metrics);

        if (this.config.options.summaryMetrics) {
            summary.summaryMetrics = this.config.options.summaryMetrics;
        }

        summary.dates = Array.from(new Set(
            Object.keys(this.rawData).reduce((acc, categoryName) => {
                return acc.concat(this.rawData[categoryName].map(e => e.date));
            }, [])
        ));

        if (this.config.options.dashboard.sectioned) {
            summary.sections = this.config.options.dashboard.sections;
        }

        summary.apiVersion = this.apiVersion;

        return summary;
    }

    getMetric(categoryName, metricName) {
        const metricConfig = this.config.options.metrics[metricName];
        const metric = {};

        let data;
        switch (metricConfig.type) {
            case 'line':
                data = this.formatLineData(categoryName, metricName);
                break;
            case 'table':
                data = this.formatTableData(categoryName, metricName);
                break;
            default:
                this.reportError(`Unsupported type "${metricConfig.type}" for metric "${metricName}" in dataset "${this.datasetName}"`);
        }

        const annotations = this.getAnnotations(categoryName, metricName);

        metric.title = metricConfig.title;
        metric.description = metricConfig.description;
        metric.type = metricConfig.type;

        if (metricConfig.type === 'line' && metricConfig.axes) {
            metric.axes = metricConfig.axes;
        }

        if (metricConfig.type === 'table') {
            metric.columns = metricConfig.columns;
        }

        metric.data = data;

        if (annotations) {
            metric.annotations = annotations;
        }

        metric.apiVersion = this.apiVersion;

        return metric;
    }

    formatLineData(categoryName, metricName) {
        const data = { populations: {} };

        this.rawData[categoryName].forEach(entry => {
            const metricValue = entry.metrics[metricName];

            // If this metric has no value at this date, move on...
            if (!metricValue) return;

            // Multiple populations
            if (typeof metricValue === 'object') {
                Object.keys(metricValue).forEach(populationName => {
                    data.populations[populationName] = data.populations[populationName] || [];
                    data.populations[populationName].push({
                        x: entry.date,
                        y: metricValue[populationName],
                    });
                });
            }

            // Single population
            else if (typeof metricValue === 'number') {
                data.populations.default = data.populations.default || [];
                data.populations.default.push({
                    x: entry.date,
                    y: metricValue,
                });
            }

            else {
                this.reportError(`Raw data is not formatted properly for metric "${metricName}" in dataset "${this.datasetName}"`);
            }
        });

        return data;
    }

    formatTableData(categoryName, metricName) {
        const data = { dates: {} };

        this.rawData[categoryName].forEach(entry => {
            Object.keys(entry.metrics[metricName]).forEach(rowName => {
                const rowValue = entry.metrics[metricName][rowName];

                data.dates[entry.date] = data.dates[entry.date] || {};
                data.dates[entry.date].rows = data.dates[entry.date].rows || [];

                data.dates[entry.date].rows.push({
                    name: rowName,
                    value: rowValue,
                });
            });
        });

        return data;
    }
}
