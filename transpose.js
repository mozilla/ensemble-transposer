const startTime = process.hrtime.bigint();

const fs = require('fs');
const path = require('path');
const processData = require('./processData');


const datasetConfigDirectory = './config/datasets';
const processPromises = [];

const filenames = fs.readdirSync(datasetConfigDirectory);

filenames.forEach(filename => {
    processPromises.push(new Promise((resolveProcess, rejectProcess) => {
        const contents = fs.readFileSync(path.join(datasetConfigDirectory, filename), 'utf8');

        const datasetName = filename.replace('.json', '');
        const datasetConfig = JSON.parse(contents);

        processData(datasetName, datasetConfig, resolveProcess, rejectProcess);
    }));
});

Promise.all(processPromises).then(() => {
    const endTime = process.hrtime.bigint();
    const elapsedSeconds = Number(endTime - startTime) / 1000000000;

    // eslint-disable-next-line no-console
    return console.log(`Wrote all files in ${elapsedSeconds.toPrecision(5)}s`);
}).catch(e => {
    // eslint-disable-next-line no-console
    console.error('Error:', e);

    // eslint-disable-next-line no-process-exit
    process.exit(1);
});
