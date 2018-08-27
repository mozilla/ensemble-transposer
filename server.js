const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const redis = require('redis');
const fs = require('fs');
const path = require('path');
const forceSSL = require('express-force-ssl');

const transpose = require('./transpose');


const app = express();
const redisClient = redis.createClient(process.env.REDIS_URL);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
        },
    },
    frameguard: {
        action: 'deny',
    },
    referrerPolicy: {
        policy: 'no-referrer',
    },
}));

if (process.env.NODE_ENV === 'production') {
    app.set('forceSSLOptions', {
        trustXFPHeader: true,
    });
    app.use(forceSSL);
}

app.use(cors());

app.use(morgan('combined'));

const send200 = (req, res) => {
    res.sendStatus(200);
};

// Redis client general error catching
redisClient.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('Redis error:', err);
});

// Provide a summary of this dataset, picking and choosing data from the big,
// transposed JSON blob as needed
function handleDatasetSummary(req, res) {
    const dataset = req.params.dataset;
    const datasetSummary = {};
    const propsToCopy = [
        'title',
        'description',
        'dates',
        'sections',
        'summaryMetrics',
        'categories',
        'defaultCategory',
        'apiVersion',
    ];

    withTransposedData(res, dataset, transposedData => {
        propsToCopy.forEach(prop => {
            if (prop in transposedData) {
                datasetSummary[prop] = transposedData[prop];
            }
        });

        datasetSummary.metrics = Object.keys(transposedData.metrics);

        res.send(datasetSummary);
    });
}

// Provide the data for a given metric in the given category, picking and
// choosing data from the big, transposed JSON blob as needed
function handleMetric(req, res) {
    const dataset = req.params.dataset;
    const category = req.params.category;
    const metricSlug = req.params.metricSlug;
    const metricData = {};

    const propsToCopy = [
        'title',
        'description',
        'type',
        'axes',
        'columns',
    ];

    withTransposedData(res, dataset, transposedData => {
        let thisMetric;

        if (metricSlug in transposedData.metrics) {
            thisMetric = transposedData.metrics[metricSlug];
        } else {
            // This metric does not exist
            return res.sendStatus(404);
        }

        propsToCopy.forEach(prop => {
            if (prop in thisMetric) {
                metricData[prop] = thisMetric[prop];
            }
        });

        if ('data' in thisMetric && category in thisMetric.data) {
            metricData.data = thisMetric.data[category];
        } else {
            // There is no data for this category
            return res.sendStatus(404);
        }

        if ('annotations' in thisMetric && category in thisMetric.annotations) {
            metricData.annotations = thisMetric.annotations[category];
        }

        metricData.apiVersion = transposedData.apiVersion;

        res.send(metricData);
    });
}

function withTransposedData(res, dataset, cb) {
    const manifestFilename = `manifests/${dataset}.json`;

    if (!fs.existsSync(manifestFilename)) {
        // eslint-disable-next-line no-console
        console.error(`Manifest doesn't exist: ${manifestFilename}`);
        res.status(500).send('Manifest does not exist');
    } else {
        redisClient.get(dataset, (err, transposedData) => {
            if (err) {
                // eslint-disable-next-line no-console
                console.error('Redis error:', err);
                res.status(500).send('Redis error');
            } else {
                if (transposedData === null) {
                    // eslint-disable-next-line no-console
                    console.log(`Cache miss: ${dataset}`);

                    fs.readFile(manifestFilename, 'utf8', (err, contents) => {
                        if (err) {
                            // eslint-disable-next-line no-console
                            console.error('Error retrieving manifest:', err);
                            res.status(500).send('Error retrieving manifest');
                        } else {
                            const manifest = JSON.parse(contents);
                            transpose(manifest, transposedData => {
                                // eslint-disable-next-line no-console
                                console.log(`Setting cache for key: ${dataset}`);
                                redisClient.setex(dataset, process.env.CACHE_SECONDS, JSON.stringify(transposedData));
                                cb(transposedData);
                            });
                        }
                    });
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Cache hit: ${dataset}`);
                    cb(JSON.parse(transposedData));
                }
            }
        });
    }
}

app.get('/datasets/:dataset/:category/:metricSlug', handleMetric);

app.get('/datasets/:dataset', handleDatasetSummary);

app.get('/__version__', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'version.json'));
});

app.get('/__heartbeat__', (req, res) => {
    if (redisClient.connected) {
        send200(req, res);
    } else {
        // eslint-disable-next-line no-console
        console.error('Redis client not connected');
        res.status(500).send('Redis client not connected');
    }
});

app.get('/__lbheartbeat__', send200);

app.listen(process.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${process.env.PORT}...`)
});
