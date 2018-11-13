const { execSync } = require('child_process');
const fs = require('fs');

const packageJSON = require('../package.json');


const outFilename = './version.json';

const versionJSON = {
    source: 'https://github.com/mozilla/ensemble-transposer',
    version: packageJSON.version,
    commit: execSync('git rev-parse HEAD').toString().trim(),
};

fs.writeFile(outFilename, JSON.stringify(versionJSON, null, 4), err => {
    if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
    } else {
        // eslint-disable-next-line no-console
        console.log('Wrote ' + outFilename);
    }
});
