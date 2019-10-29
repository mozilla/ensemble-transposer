const startTime = process.hrtime();

const fs = require('fs');
const path = require('path');
const processData = require('./processData');


exports.default = async () => {
    const datasetConfigDirectory = path.join(__dirname, '../config/datasets');
    const configFilenames = fs.readdirSync(datasetConfigDirectory);

    const processPromises = [];

    for (const configFilename of configFilenames) {
        const datasetName = configFilename.replace('.json', '');
        const datasetConfig = JSON.parse(
            fs.readFileSync(
                path.join(datasetConfigDirectory, configFilename),
                'utf8',
            )
        );

        processPromises.push(
            processData(datasetName, datasetConfig)
        );
    }

    try {
        await Promise.all(processPromises);

        const timeDifference = process.hrtime(startTime);
        const nanosecondsInEachSecond = 1e9;
        const timePrecision = 5;

        // timeDifference is an array where the first element is the number of
        // seconds that have passed and the second element is the number of
        // *additional* nanoseconds that have passed
        const elapsedSeconds = timeDifference[0] +
                               (timeDifference[1] / nanosecondsInEachSecond);

        // eslint-disable-next-line no-console
        console.log(`Wrote all files in ${elapsedSeconds.toPrecision(timePrecision)}s`);
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
