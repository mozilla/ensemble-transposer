require('dotenv').config();

const fetch = require('node-fetch');
const S3 = require('aws-sdk/clients/s3');
const {Storage} = require('@google-cloud/storage');
const fse = require('fs-extra');

const QuantumFormatter = require('./formatters/QuantumFormatter');
const BabbageFormatter = require('./formatters/BabbageFormatter');
const RedashFormatter = require('./formatters/RedashFormatter');

const timePrecision = 5;

module.exports = async (datasetName, datasetConfig) => {
    for (const platform of Object.keys(datasetConfig.sources)) {
        const dataURL = parseDataURL(datasetConfig.sources[platform].data.url);
        const data = await getJSON(dataURL);

        let annotations;
        if (datasetConfig.sources[platform].annotations && datasetConfig.sources[platform].annotations.url) {
            annotations = await getJSON(datasetConfig.sources[platform].annotations.url);
        }

        const format = datasetConfig.sources[platform].data.format;

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
                throw new Error(`Format "${format}" is not supported (set for platform ${platform} of dataset "${datasetName}")`);
        }

        const formatter = new FormatterConstructor(datasetName, platform, datasetConfig, data, annotations);

        const summary = await formatter.getSummary();

        const writePromises = [];

        writePromises.push(new Promise((resolve, reject) => {
            writeData(
                `datasets/${platform}/${datasetName}/index.json`,
                JSON.stringify(summary),
            ).then(resolve).catch(reject);
        }));

        for (const categoryName of summary.categories) {
            for (const metricName of summary.metrics) {

                const filename = `datasets/${platform}/${datasetName}/${categoryName}/${metricName}/index.json`;
                const metric = await formatter.getMetric(categoryName, metricName);

                writePromises.push(new Promise((resolve, reject) => {
                    writeData(
                        filename,
                        JSON.stringify(metric),
                    ).then(resolve).catch(reject);
                }));

            }
        }

        await Promise.all(writePromises);

        formatter.clearCache();
    }
}

function parseDataURL(urlConfig) {
    if (typeof urlConfig === 'string') return urlConfig;
    return urlConfig.base + '?' + Object.keys(urlConfig.query).map(q => {
        return `${q}=${process.env[urlConfig.query[q]]}`;
    }).join('&');
}

async function getJSON(url) {
    const response = await fetch(url);
    return await response.json()
}

function writeData(filename, data) {
    return new Promise((resolve, reject) => {
        const startTime = process.hrtime();
        var protocol;
        var bucketName;
        var uploadPromise;

        if (process.env.GCS_BUCKET_NAME !== undefined) {
            protocol = 'gs'
            bucketName = process.env.GCS_BUCKET_NAME;
            uploadPromise = new Storage().bucket(bucketName).file(filename).save(data, {contentType: 'application/json'});
        } else if (process.env.AWS_BUCKET_NAME !== undefined) {
            protocol = 's3'
            bucketName = process.env.AWS_BUCKET_NAME;

            const objectParams = {
                Bucket: bucketName,
                Key: filename,
                Body: data,
                ContentType: 'application/json',
            };

            uploadPromise = new S3({
                apiVersion: '2006-03-01',
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }).putObject(objectParams).promise();
        } else {
            protocol = 'file'
            bucketName = `${process.cwd()}/target`
            uploadPromise = fse.outputFile(`${bucketName}/${filename}`, data);
        }

        uploadPromise.then(() => {
            const timeDifference = process.hrtime(startTime);
            const elapsedMilliseconds = timeDifferenceToMilliseconds(timeDifference);

            // eslint-disable-next-line no-console
            console.log(`[${new Date().toISOString()}] wrote ${protocol}://${bucketName}/${filename} in ${elapsedMilliseconds.toPrecision(timePrecision)}ms`);

            return resolve();
        }).catch(err => {
            return reject(err);
        });
    });
}

function timeDifferenceToMilliseconds(timeDifference) {
    const millisecondsInEachSecond = 1000;
    const nanosecondsInEachMillisecond = 1e6;

    // timeDifference is an array where the first element is the number of
    // seconds that have passed and the second element is the number of
    // *additional* nanoseconds that have passed
    return (
        timeDifference[0] * millisecondsInEachSecond
    ) + (
        timeDifference[1] / nanosecondsInEachMillisecond
    );
}
