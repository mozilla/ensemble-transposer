const request = require('request-promise-native');
const fs = require('fs');
const mkdirp = require('mkdirp');

const QuantumFormatter = require('./formatters/QuantumFormatter');
const BabbageFormatter = require('./formatters/BabbageFormatter');
const RedashFormatter = require('./formatters/RedashFormatter');


module.exports = async (datasetName, datasetConfig) => {
    const dataURL = parseDataURL(datasetConfig.sources.data.url);

    const data = await getJSON(dataURL);

    let annotations;
    if (datasetConfig.sources.annotations && datasetConfig.sources.annotations.url) {
        annotations = await getJSON(datasetConfig.sources.annotations.url);
    }

    const format = datasetConfig.sources.data.format;

    let FormatterConstructor;
    switch(format) {
        case 'quantum':
            FormatterConstructor = QuantumFormatter;
            break;
        case 'babbage':
            FormatterConstructor = BabbageFormatter;
            break;
        case 'redash':
            FormatterConstructor = RedashFormatter;
            break;
        default:
            throw new Error(`Format "${format}" is not supported (set for dataset "${datasetName}")`);
    }

    const formatter = new FormatterConstructor(datasetName, datasetConfig, data, annotations);

    const summary = await formatter.getSummary();

    const writePromises = [];

    writePromises.push(new Promise(resolve => {
        writeJSON(`transposed/${datasetName}/index.json`, summary, resolve);
    }));

    for (const categoryName of summary.categories) {
        for (const metricName of summary.metrics) {

            writePromises.push(new Promise(async resolve => {
                const metric = await formatter.getMetric(categoryName, metricName);
                const filename = `transposed/${datasetName}/${categoryName}/${metricName}/index.json`;
                writeJSON(filename, metric, resolve);
            }));

        }
    }

    await Promise.all(writePromises);
}

function parseDataURL(urlConfig) {
    if (typeof urlConfig === 'string') return urlConfig;
    return urlConfig.base + '?' + Object.keys(urlConfig.query).map(q => {
        return `${q}=${process.env[urlConfig.query[q]]}`;
    }).join('&');
}

async function getJSON(url) {
    return JSON.parse(await request(url));
}

function writeJSON(path, json, resolve) {
    const dir = path.substr(0, path.lastIndexOf('/'));

    mkdirp(dir, err => {
        if (err) throw err;

        const startTime = process.hrtime.bigint();
        fs.writeFile(path, JSON.stringify(json), err => {
            if (err) throw err;

            const endTime = process.hrtime.bigint();
            const elapsedMilliseconds = Number(endTime - startTime) / 1000000;

            // eslint-disable-next-line no-console
            console.log(`[${new Date().toISOString()}] Wrote ${path} in ${elapsedMilliseconds}ms`);

            return resolve();
        });
    });
}
