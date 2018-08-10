const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

const transpose = require('./transpose');


const app = express();
const redisClient = redis.createClient(process.env.REDIS_URL);

app.use(helmet());
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

function handleDataset(req, res) {
    const dataset = req.params.dataset;
    const manifestFilename = `manifests/${dataset}.json`;

    if (!fs.existsSync(manifestFilename)) {
        // eslint-disable-next-line no-console
        console.error(`Manifest doesn't exist: ${manifestFilename}`);
        res.status(500).send('Manifest does not exist');
    } else {
        redisClient.get(dataset, (err, data) => {
            if (err) {
                // eslint-disable-next-line no-console
                console.error('Redis error:', err);
                res.status(500).send('Redis error');
            } else {
                if (data === null) {
                    // eslint-disable-next-line no-console
                    console.log(`Cache miss: ${dataset}`);
                    sendTransposeOutput(res, dataset, manifestFilename);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Cache hit: ${dataset}`);
                    res.send(JSON.parse(data));
                }
            }
        });
    }
}

function sendTransposeOutput(res, dataset, manifestFilename) {
    fs.readFile(manifestFilename, 'utf8', (err, contents) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error('Error retrieving manifest:', err);
            res.status(500).send('Error retrieving manifest');
        } else {
            const manifest = JSON.parse(contents);
            transpose(manifest, output => {
                // eslint-disable-next-line no-console
                console.log(`Setting cache for key: ${dataset}`);
                redisClient.setex(dataset, process.env.CACHE_SECONDS, JSON.stringify(output));
                res.send(output);
            });
        }
    });
}

app.get('/datasets/:dataset', handleDataset);

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
