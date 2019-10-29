module.exports = class {
    constructor(datasetName, platform, config, rawData, rawAnnotations) {
        this.datasetName = datasetName;
        this.platform = platform;
        this.config = config;
        this.rawData = rawData;
        this.rawAnnotations = rawAnnotations;

        this.checkForErrors();
    }

    getSummary() {
        throw new Error(`getSummary not implemented for format ${this.config.sources[this.platform].data.format}`);
    }

    getMetric() {
        throw new Error(`getMetric not implemented for format ${this.config.sources[this.platform].data.format}`);
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

    clearCache() {
        return;
    }

    checkForErrors() {
        return;
    }
}
