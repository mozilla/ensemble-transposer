const fetch = require("node-fetch");
const fs = require('fs');
const path = require('path');
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
    const response = await fetch(`https://data.firefox.com/datasets/${identifier}/index.json`);
    return await response.json();
}

module.exports = {
    getDatasetNames,
    getPlatforms,
    getDevelopmentJSON,
    getProductionJSON,
};
