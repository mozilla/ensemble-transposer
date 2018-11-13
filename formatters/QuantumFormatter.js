const Formatter = require('./Formatter');


module.exports = class extends Formatter {
    constructor(...args) {
        super(...args);
        this.apiVersion = '1.0.0';
    }

    getSummary() {
        const summary = {};

        summary.title = this.manifest.extraMetadata.title;
        summary.description = this.manifest.extraMetadata.description;
        summary.categories = Object.keys(this.rawData);

        if (this.manifest.extraMetadata.defaultCategory) {
            summary.defaultCategory = this.manifest.extraMetadata.defaultCategory;
        }

        summary.metrics = Object.keys(this.manifest.extraMetadata.metrics);

        if (this.manifest.extraMetadata.summaryMetrics) {
            summary.summaryMetrics = this.manifest.extraMetadata.summaryMetrics;
        }

        summary.dates = Array.from(new Set(
            Object.keys(this.rawData).reduce((acc, categoryName) => {
                return acc.concat(this.rawData[categoryName].map(e => e.date));
            }, [])
        ));

        if (this.manifest.extraMetadata.dashboard.sectioned) {
            summary.sections = this.manifest.extraMetadata.dashboard.sections;
        }

        summary.apiVersion = this.apiVersion;

        return summary;
    }

    getMetric(categoryName, metricName) {
        const metricMeta = this.manifest.extraMetadata.metrics[metricName];
        const metric = {};

        let data;
        switch (metricMeta.type) {
            case 'line':
                data = this.formatLineData(categoryName, metricName);
                break;
            case 'table':
                data = this.formatTableData(categoryName, metricName);
                break;
            default:
                // eslint-disable-next-line no-console
                return console.error(`Unsupported type: ${metricMeta.type}`);
        }

        const annotations = [];
        if (this.rawAnnotations) {
            this.rawAnnotations[categoryName].forEach(annotation => {
                if (metricName in annotation.annotation) {
                    annotations.push({
                        date: annotation.date,
                        label: annotation.annotation[metricName],
                    });
                }
            });
        }

        metric.title = metricMeta.title;
        metric.description = metricMeta.description;
        metric.type = metricMeta.type;

        if (metricMeta.type === 'line' && metricMeta.axes) {
            metric.axes = metricMeta.axes;
        }

        if (metricMeta.type === 'table') {
            metric.columns = metricMeta.columns;
        }

        metric.data = data;

        if (annotations.length) {
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
                // eslint-disable-next-line no-console
                return console.error('Input format error');
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
