const fs = require('fs');
const request = require('request-promise-native');


async function getJSON(url) {
    return JSON.parse(await request(url));
}

async function getLocalJSON(path) {
    return getJSON(`http://localhost:3000/datasets/${path}`);
}

async function getProductionJSON(path) {
    return getJSON(`https://ensemble-transposer.herokuapp.com/datasets/${path}`);
}

function getDatasetNames() {
    const datasetConfigDirectory = './config/datasets';
    const filenames = fs.readdirSync(datasetConfigDirectory);
    const datasetNames = [];

    for (const filename of filenames) {
        datasetNames.push(filename.replace('.json', ''));
    }

    return datasetNames;
}

module.exports = {
    getLocalJSON,
    getProductionJSON,
    getDatasetNames,
};
