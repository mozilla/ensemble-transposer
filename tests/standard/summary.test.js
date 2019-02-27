const { assert } = require('chai');
const utils = require('../utils');


it('All dates are in descending order', function(done) {
    async function testDatasets() {
        const datasetNames = utils.getDatasetNames();

        for (const datasetName of datasetNames) {
            for (const platform of await utils.getPlatforms(datasetName)) {
                const localSummary = await utils.getLocalJSON(`${platform}/${datasetName}`);
                const returnedDates = localSummary.dates;
                const correctlySortedDates = returnedDates.concat().sort().reverse();

                assert.deepEqual(returnedDates, correctlySortedDates);
            }
        }
    }

    testDatasets().then(done).catch(done);
});
