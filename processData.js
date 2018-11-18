const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');

const QuantumFormatter = require('./formatters/QuantumFormatter');
const BabbageFormatter = require('./formatters/BabbageFormatter');


function processData(datasetName, datasetConfig, resolveProcess, reportError) {
    const dataFormat = datasetConfig.sources.data.format;
    const fetchPromises = [];

    // Data promise
    fetchPromises.push(new Promise((resolve, reject) => {
        get(datasetConfig.sources.data.url, resolve, reject);
    }));

    // Annotation promise (if this dataset has annotations at all)
    if (datasetConfig.sources.annotations && datasetConfig.sources.annotations.url) {
        fetchPromises.push(new Promise((resolve, reject) => {
            get(datasetConfig.sources.annotations.url, resolve, reject);
        }));
    }

    Promise.all(fetchPromises).then(([data, annotations]) => {
        const writePromises = [];

        let formatter;
        switch(dataFormat) {
            case 'quantum':
                formatter = new QuantumFormatter(datasetName, datasetConfig, data, annotations, reportError);
                break;
            case 'babbage':
                formatter = new BabbageFormatter(datasetName, datasetConfig, data, annotations, reportError);
                break;
            default:
                reportError(`Format "${dataFormat}" is not supported (set for dataset "${datasetName}")`);
        }

        const summary = formatter.getSummary();

        writePromises.push(new Promise((resolve, reject) => {
            writeJSON(`transposed/${datasetName}/index.json`, summary, resolve, reject);
        }));

        summary.categories.forEach(categoryName => {
            summary.metrics.forEach(metricName => {
                writePromises.push(new Promise((resolve, reject) => {
                    writeJSON(
                        `transposed/${datasetName}/${categoryName}/${metricName}/index.json`,
                        formatter.getMetric(categoryName, metricName),
                        resolve,
                        reject,
                    );
                }));
            });
        });

        Promise.all(writePromises).then(resolveProcess).catch(reportError);
    }).catch(reportError);
}

function get(url, resolve, reject) {
    request(url, (err, response, body) => {
        if (err) return reject(err);
        return resolve(JSON.parse(body));
    });
}

function writeJSON(path, json, resolve, reject) {
    const dir = path.substr(0, path.lastIndexOf('/'));

    mkdirp(dir, err => {
        if (err) return reject(err);

        const startTime = process.hrtime.bigint();
        fs.writeFile(path, JSON.stringify(json), err => {
            if (err) return reject(err);

            const endTime = process.hrtime.bigint();
            const elapsedMilliseconds = Number(endTime - startTime) / 1000000;

            // eslint-disable-next-line no-console
            console.log(`[${new Date().toISOString()}] Wrote ${path} in ${elapsedMilliseconds}ms`);

            return resolve();
        });
    });
}

module.exports = processData;
