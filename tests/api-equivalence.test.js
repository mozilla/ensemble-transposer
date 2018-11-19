const request = require('request-promise-native');
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');

chai.use(deepEqualInAnyOrder);


async function getJSON(url) {
    return JSON.parse(await request(url));
}

async function getLocalJSON(path) {
    return getJSON(`http://localhost:3000/datasets/${path}`);
}

async function getProductionJSON(path) {
    return getJSON(`https://ensemble-transposer.herokuapp.com/datasets/${path}`);
}

it('Local API output is equivalent to production API output', function(done) {
    this.timeout(50000);

    async function compare() {
        const dashboards = [
            'hardware',
            'user-activity',
            'usage-behavior',
        ];

        for (const dashboardName of dashboards) {
            const localSummary = await getLocalJSON(dashboardName);
            const productionSummary = await getProductionJSON(dashboardName);
            chai.expect(productionSummary).to.deep.equalInAnyOrder(localSummary);

            for (const categoryName of localSummary.categories) {
                for (const metricName of localSummary.metrics) {
                    const metricPath = `${dashboardName}/${categoryName}/${metricName}`;
                    const localMetric = await getLocalJSON(metricPath);
                    const productionMetric = await getProductionJSON(metricPath);
                    chai.expect(productionMetric).to.deep.equalInAnyOrder(localMetric);
                }
            }
        }
    }

    compare().then(done).catch(done);
});
