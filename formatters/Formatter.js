module.exports = class {
    constructor(datasetName, config, rawData, rawAnnotations, reportError) {
        this.datasetName = datasetName;
        this.config = config;
        this.rawData = rawData;
        this.rawAnnotations = rawAnnotations;
        this.reportError = reportError;
    }

    getSummary() {
        this.reportError(`getSummary not implemented for format ${this.config.sources.data.format}`);
    }

    getMetric() {
        this.reportError(`getMetric not implemented for format ${this.config.sources.data.format}`);
    }

    getAnnotations(categoryName, metricName) {
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

        if (annotations.length) {
            return annotations;
        }
    }
}
