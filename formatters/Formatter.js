module.exports = class {
    constructor(manifest, rawData, rawAnnotations) {
        this.manifest = manifest;
        this.rawData = rawData;
        this.rawAnnotations = rawAnnotations;
    }

    getSummary() {
        // eslint-disable-next-line no-console
        console.error(`Error: getSummary not implemented for format ${this.manifest.sources.data.format}`);
    }

    getMetric() {
        // eslint-disable-next-line no-console
        console.error(`Error: getMetric not implemented for format ${this.manifest.sources.data.format}`);
    }
}
