const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const forceSSL = require('express-force-ssl');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');


const app = express();

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

function handleDatasetSummary(req, res) {
    const datasetName = req.params.datasetName;

    fs.readFile(`./transposed/${datasetName}/index.json`, 'utf8', (err, contents) => {
        // eslint-disable-next-line no-console
        if (err) return console.error(err);
        res.send(JSON.parse(contents));
    });
}

function handleMetric(req, res) {
    const datasetName = req.params.datasetName;
    const categoryName = req.params.categoryName;
    const metricName = req.params.metricName;

    fs.readFile(`./transposed/${datasetName}/${categoryName}/${metricName}/index.json`, 'utf8', (err, contents) => {
        // eslint-disable-next-line no-console
        if (err) return console.error(err);
        res.send(JSON.parse(contents));
    });
}

app.get('/datasets/:datasetName/:categoryName/:metricName', handleMetric);

app.get('/datasets/:datasetName', handleDatasetSummary);

app.get('/__version__', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'version.json'));
});

app.get('/__heartbeat__', send200);

app.get('/__lbheartbeat__', send200);

app.listen(process.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${process.env.PORT}...`)
});

const rewriteFilesInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
setInterval(() => {
    exec('node transpose', (err, stdout, stderr) => {
        if (err || stderr) {
            if (err) {
                // eslint-disable-next-line no-console
                console.error(err);
            }

            if (stderr) {
                // eslint-disable-next-line no-console
                console.error(stderr);
            }
        } else {
            // eslint-disable-next-line no-console
            console.log(stdout);
        }
    });
}, rewriteFilesInterval);
