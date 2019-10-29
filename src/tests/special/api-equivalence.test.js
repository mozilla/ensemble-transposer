const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');

const utils = require('../utils');

chai.use(deepEqualInAnyOrder);


it('Development API output is equivalent to production API output', function(done) {
    this.timeout(50000);

    async function compare() {
        const datasetNames = utils.getDatasetNames();

        for (const datasetName of datasetNames) {

            for (const platform of await utils.getPlatforms(datasetName)) {
                const developmentSummary = await utils.getDevelopmentJSON(`${platform}/${datasetName}`);
                const productionSummary = await utils.getProductionJSON(`${platform}/${datasetName}`);

                chai.expect(productionSummary).to.deep.equalInAnyOrder(developmentSummary);

                // The order of the dates *does* matter
                chai.expect(productionSummary.dates).to.deep.equal(developmentSummary.dates);

                for (const categoryName of developmentSummary.categories) {
                    for (const metricName of developmentSummary.metrics) {
                        const metricPath = `${platform}/${datasetName}/${categoryName}/${metricName}`;
                        const developmentMetric = await utils.getDevelopmentJSON(metricPath, platform);
                        const productionMetric = await utils.getProductionJSON(metricPath, platform);
                        chai.expect(productionMetric).to.deep.equalInAnyOrder(developmentMetric);
                    }
                }
            }
        }
    }

    compare().then(done).catch(done);
});
