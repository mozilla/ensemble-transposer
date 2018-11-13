const request = require('request');
const chai = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');

chai.use(deepEqualInAnyOrder);


function getJSON(url, cb) {
    request(url, (err, response, body) => {
        // eslint-disable-next-line no-console
        if (err) return console.error(err);
        cb(JSON.parse(body));
    });
}

function getLocalJSON(path, cb) {
    getJSON(`http://localhost:3000/datasets/${path}`, cb);
}

function getProductionJSON(path, cb) {
    getJSON(`https://ensemble-transposer.herokuapp.com/datasets/${path}`, cb);
}

it('Local API output is equivalent to production API output', function(done) {
    this.timeout(50000);

    const dashboards = [
        'hardware',
        'user-activity',
        'usage-behavior',
    ];

    dashboards.forEach(dashboardName => {
        getLocalJSON(dashboardName, localSummary => {
            const promises = [];

            promises.push(new Promise(resolve => {
                getProductionJSON(dashboardName, productionSummary => {
                    chai.expect(productionSummary).to.deep.equalInAnyOrder(localSummary);
                    return resolve();
                });
            }));

            localSummary.categories.forEach(categoryName => {
                localSummary.metrics.forEach(metricName => {
                    promises.push(new Promise(resolve => {
                        const metricPath = `${dashboardName}/${categoryName}/${metricName}`;
                        getLocalJSON(metricPath, localMetric => {
                            getProductionJSON(metricPath, productionMetric => {
                                chai.expect(productionMetric).to.deep.equalInAnyOrder(localMetric);
                                return resolve();
                            });
                        });
                    }));
                });
            });

            Promise.all(promises).then(() => done());
        });
    });
});
