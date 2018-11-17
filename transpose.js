const startTime = process.hrtime.bigint();

const fs = require('fs');
const path = require('path');
const processData = require('./processData');


const datasetConfigDirectory = './config/datasets';

new Promise((resolveTranspose, rejectTranspose) => {
    fs.readdir(datasetConfigDirectory, (err, filenames) => {
        if (err) return rejectTranspose(err);

        const processingPromises = [];

        filenames.forEach(filename => {
            processingPromises.push(new Promise((resolveProcessing, rejectProcessing) => {
                fs.readFile(path.join(datasetConfigDirectory, filename), 'utf8', (err, contents) => {
                    if (err) return rejectProcessing(err);

                    const datasetName = filename.replace('.json', '');
                    const datasetConfig = JSON.parse(contents);

                    processData(datasetName, datasetConfig, resolveProcessing)
                });
            }));
        });

        Promise.all(processingPromises).then(() => {
            return resolveTranspose()
        }).catch(err => {
            // eslint-disable-next-line no-console
            return console.error(err);
        });
    });
}).then(() => {
    const endTime = process.hrtime.bigint();
    const elapsedSeconds = Number(endTime - startTime) / 1000000000;

    // eslint-disable-next-line no-console
    console.log(`Wrote all files in ${elapsedSeconds.toPrecision(5)}s`);
}).catch(err => {
    // eslint-disable-next-line no-console
    console.error(err)
});
