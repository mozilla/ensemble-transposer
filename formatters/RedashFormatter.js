const Formatter = require('./Formatter');
const request = require('request-promise-native');


module.exports = class extends Formatter {
    constructor(...args) {
        super(...args);
        this.apiKey = process.env[this.config.sources.data.url.query.api_key];
        this.apiVersion = '1.0.0';
    }

    async getSummary() {
        const summary = {};

        summary.title = this.rawData.name;
        summary.description = this.config.options.description;
        summary.categories = ['default'];
        summary.metrics = this.rawData.widgets.map(w => w.id.toString());

        if (this.config.options.summaryMetrics) {
            summary.summaryMetrics = this.config.options.summaryMetrics;
        }

        summary.dates = await this.getDates(summary.metrics);

        if (this.config.options.dashboard.sectioned) {
            summary.sections = this.config.options.dashboard.sections;
        }

        summary.apiVersion = this.apiVersion;

        return summary;
    }

    async getMetric() {
    }

    async getDates(metrics) {
        const dates = new Set();

        for (const metricId of metrics) {
            const queryURL = `https://sql.telemetry.mozilla.org/api/queries/${metricId}/results.json?api_key=${this.apiKey}`;
            const queryJSON = JSON.parse(await request(queryURL));

            for (const row of queryJSON.query_result.data.rows) {
                dates.add(row.date.substring(0, 10));
            }
        }

        return Array.from(dates).sort();
    }
}
