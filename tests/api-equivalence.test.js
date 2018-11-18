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

    const dashboardPromises = [];

    dashboards.forEach(dashboardName => {
        dashboardPromises.push(new Promise(resolveDashboard => {
            getLocalJSON(dashboardName, localSummary => {
                const metricPromises = [];

                metricPromises.push(new Promise(resolveSummary => {
                    getProductionJSON(dashboardName, productionSummary => {
                        chai.expect(productionSummary).to.deep.equalInAnyOrder(localSummary);
                        return resolveSummary();
                    });
                }));

                localSummary.categories.forEach(categoryName => {
                    localSummary.metrics.forEach(metricName => {
                        metricPromises.push(new Promise(resolveMetric => {
                            const metricPath = `${dashboardName}/${categoryName}/${metricName}`;
                            getLocalJSON(metricPath, localMetric => {
                                getProductionJSON(metricPath, productionMetric => {
                                    chai.expect(productionMetric).to.deep.equalInAnyOrder(localMetric);
                                    return resolveMetric();
                                });
                            });
                        }));
                    });
                });

                Promise.all(metricPromises).then(() => resolveDashboard());
            });
        }));
    });

    Promise.all(dashboardPromises).then(() => done());
});
