const Formatter = require('./Formatter');
const request = require('request-promise-native');
const memoize = require('memoizee');


module.exports = class extends Formatter {
    constructor(...args) {
        super(...args);
        this.apiVersion = '1.0.0';

        this.getRawMetric = memoize(async metricName => {
            const visualization = this.getVisualization(metricName);
            const apiKey = visualization.query.api_key;
            const endpoint = `https://sql.telemetry.mozilla.org/api/queries/${metricName}/results.json?api_key=${apiKey}`;
            return JSON.parse(await request(endpoint));
        });
    }

    async getSummary() {
        const summary = {};

        summary.title = this.rawData.name;
        summary.description = this.config.options.description;
        summary.categories = ['default'];
        summary.metrics = this.rawData.widgets.map(w => w.visualization.query.id.toString());

        if (this.config.options.summaryMetrics) {
            summary.summaryMetrics = this.config.options.summaryMetrics;
        }

        summary.dates = await this.getDates(summary.metrics);

        if (this.config.options.dashboard && this.config.options.dashboard.sectioned) {
            summary.sections = this.config.options.dashboard.sections;
        }

        summary.apiVersion = this.apiVersion;

        return summary;
    }

    async getMetric(categoryName, metricName) {
        const metric = {};

        const rawMetric = await this.getRawMetric(metricName);
        const visualization = this.getVisualization(metricName);
        const rawDescription = visualization.query.description;
        const annotations = this.getAnnotations(categoryName, metricName);
        const axes = this.getAxes(visualization);

        metric.title = visualization.query.name;

        if (rawDescription) {
            metric.description = rawDescription.split(/[\r\n]+/).map(s => s.trim());
        }

        metric.type = 'line';

        if (axes) {
            metric.axes = axes;
        }

        metric.data = this.getData(metricName, rawMetric, visualization);

        if (annotations) {
            metric.annotations = annotations;
        }

        metric.apiVersion = this.apiVersion;

        return metric;
    }

    clearCache() {
        this.getRawMetric.clear();
    }

    checkForErrors() {
        const visualizations = this.rawData.widgets.map(w => w.visualization);

        for (const visualization of visualizations) {
            const type = visualization.type;
            if (type !== 'CHART') {
                throw new Error(`Visualization type "${type}" is not supported in dataset "${this.datasetName}"`);
            }

            const gst = visualization.options.globalSeriesType;
            if (gst !== 'line') {
                throw new Error(`globalSeriesType "${gst}" is not supported in dataset "${this.datasetName}"`);
            }
        }
    }

    getVisualization(metricName) {
        return this.rawData.widgets.find(w => {
            return w.visualization.query.id === Number(metricName);
        }).visualization;
    }

    async getDates(metrics) {
        const dates = new Set();

        for (const metricName of metrics) {
            const rawMetric = await this.getRawMetric(metricName);

            const xFieldName = this.getXFieldName(metricName);

            for (const row of rawMetric.query_result.data.rows) {
                dates.add(row[xFieldName].substring(0, 10));
            }
        }

        return Array.from(dates).sort();
    }

    // Ignore the x axis label for now. Ensemble currently only supports
    // time-series charts and it doesn't label their x axes.
    getAxes(visualization) {
        const axes = {};
        const options = visualization.options;

        if (options.yAxis) {
            // There may be multiple y axes
            const firstLabelConfig = options.yAxis.find(y => {
                return y.title && y.title.text;
            });

            if (firstLabelConfig) {
                axes.y = {
                    unit: firstLabelConfig.title.text,
                };
            }
        }

        if (Object.keys(axes).length === 0) return;
        return axes;
    }

    getData(metricName, rawMetric, visualization) {
        const data = { populations: {} };

        const xFieldName = this.getXFieldName(metricName);

        let yFields = [];
        let seriesFields = [];

        for (const columnName of Object.keys(visualization.options.columnMapping)) {
            const columnValue = visualization.options.columnMapping[columnName];

            if (columnValue === 'y') {
                yFields.push(columnName);
            } else if (columnValue === 'series') {
                seriesFields.push(columnName);
            }
        }

        for (const row of rawMetric.query_result.data.rows) {
            const seriesFound = seriesFields.some(sn => {
                return Object.keys(row).includes(sn);
            });

            if (seriesFound) {
                for (const seriesName of seriesFields) {
                    const populationName = row[seriesName];
                    data.populations[populationName] = data.populations[populationName] || [];

                    if (yFields.length !== 1) {
                        throw new Error('If a series is found, "yFields" should have exactly one member');
                    }

                    data.populations[populationName].push({
                        x: row[xFieldName],
                        y: row[yFields[0]],
                    });
                }
            } else {
                const populations = yFields;
                for (const populationName of populations) {
                    data.populations[populationName] = data.populations[populationName] || [];
                    data.populations[populationName].push({
                        x: row[xFieldName],
                        y: row[populationName],
                    });
                }
            }
        }

        return data;
    }

    getXFieldName(metricName, visualization) {
        if (!visualization) {
            visualization = this.getVisualization(metricName);
        }

        return Object.keys(visualization.options.columnMapping).find(columnName => {
            return visualization.options.columnMapping[columnName] === 'x';
        });
    }
}
