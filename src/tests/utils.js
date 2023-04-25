const fs = require('fs');
const path = require('path');
const request = require('request-promise-native');
const { promisify } = require('util');


const readFilePromisified = promisify(fs.readFile);

function getDatasetNames() {
    const datasetConfigDirectory = path.join(
        __dirname,
        '../../config/datasets'
    );
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
        `../../config/datasets/${datasetName}.json`
    ), 'utf-8'));

    return Object.keys(datasetConfig.sources);
}

async function getDevelopmentJSON(identifier) {
    const Body = await readFilePromisified(`target/datasets/${identifier}/index.json`);
    return JSON.parse(Body);
}

async function getProductionJSON(identifier) {
    return JSON.parse(await request(
        `https://data.firefox.com/datasets/${identifier}/index.json`
    ));
}

module.exports = {
    getDatasetNames,
    getPlatforms,
    getDevelopmentJSON,
    getProductionJSON,
};
