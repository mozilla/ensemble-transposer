const fs = require('fs');
const path = require('path');
const request = require('request-promise-native');
const S3 = require('aws-sdk/clients/s3');
const { promisify } = require('util');


const readFilePromisified = promisify(fs.readFile);

function getDatasetNames() {
    const datasetConfigDirectory = path.join(__dirname, '../config/datasets');
    const filenames = fs.readdirSync(datasetConfigDirectory);
    const datasetNames = [];

    for (const filename of filenames) {
        datasetNames.push(filename.replace('.json', ''));
    }

    return datasetNames;
}

async function getPlatforms(datasetName) {
    const datasetConfig = JSON.parse(await readFilePromisified(path.join(
        __dirname,
        `../config/datasets/${datasetName}.json`
    ), 'utf-8'));

    return Object.keys(datasetConfig.sources);
}

async function getDevelopmentJSON(identifier) {
    const objectParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `datasets/${identifier}/index.json`,
    };

    const { Body } = await new S3({
        apiVersion: '2006-03-01',
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }).getObject(objectParams).promise();

    return JSON.parse(Body);
}

async function getProductionJSON(identifier) {
    return JSON.parse(await request(
        `https://data.firefox.com/datasets/${identifier}`
    ));
}

module.exports = {
    getDatasetNames,
    getPlatforms,
    getDevelopmentJSON,
    getProductionJSON,
};
