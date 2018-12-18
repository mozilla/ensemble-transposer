const startTime = process.hrtime.bigint();

const fs = require('fs');
const path = require('path');
const processData = require('./processData');


const datasetConfigDirectory = './config/datasets';
const filenames = fs.readdirSync(datasetConfigDirectory);

async function transpose() {
    const processPromises = [];

    for (const filename of filenames) {
        const contents = fs.readFileSync(path.join(datasetConfigDirectory, filename), 'utf8');

        const datasetName = filename.replace('.json', '');
        const datasetConfig = JSON.parse(contents);

        processPromises.push(
            processData(datasetName, datasetConfig)
        );
    }

    try {
        await Promise.all(processPromises);

        const endTime = process.hrtime.bigint();
        const elapsedSeconds = Number(endTime - startTime) / 1000000000;

        // eslint-disable-next-line no-console
        console.log(`Wrote all files in ${elapsedSeconds.toPrecision(5)}s`);
    } catch (err) {
        if (err.stack) {
            // eslint-disable-next-line no-console
            console.error('Error:', err.stack);
        } else if (err.message) {
            // eslint-disable-next-line no-console
            console.error('Error:', err.message);
        } else {
            // eslint-disable-next-line no-console
            console.error('Error:', err);
        }

        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
}

transpose();
