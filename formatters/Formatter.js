module.exports = class {
    constructor(config, rawData, rawAnnotations) {
        this.config = config;
        this.rawData = rawData;
        this.rawAnnotations = rawAnnotations;
    }

    getSummary() {
        // eslint-disable-next-line no-console
        console.error(`Error: getSummary not implemented for format ${this.config.sources.data.format}`);
    }

    getMetric() {
        // eslint-disable-next-line no-console
        console.error(`Error: getMetric not implemented for format ${this.config.sources.data.format}`);
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
