/* eslint no-console: 0 */

import restify from 'restify';
import fs from 'fs';
import restifyCORSMiddleware from 'restify-cors-middleware';
import redis from 'redis';

import transpose from './transpose';


const server = restify.createServer();
const port = process.env.PORT || 8000;
const redisClient = redis.createClient(process.env.REDIS_URL);
const cacheSeconds = process.env.CACHE_SECONDS || 1;

// Redis client general error catching.
redisClient.on('error', (err) => {
    console.error(`Error: ${err}`);
});

function respond(req, res, next) {
    const dataset = req.params.dataset;
    const manifestFilename = `manifests/${dataset}.json`;

    if (!fs.existsSync(manifestFilename)) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not found');
        next();
        return;
    }

    redisClient.get(dataset, (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        if (data === null) {
            console.log(`Cache miss: ${dataset}`);
            sendTransposeOutput(res, dataset, manifestFilename);
        } else {
            console.log(`Cache hit: ${dataset}`);
            res.send(JSON.parse(data));
        }
    });

    next();
}

function sendTransposeOutput(res, dataset, manifestFilename) {
    fs.readFile(manifestFilename, 'utf8', (error, contents) => {
        if (error) {
            res.send({
                error: true,
            });
            console.error(error);
            return;
        } else {
            const manifest = JSON.parse(contents);
            transpose(manifest, output => {
                console.log(`Setting cache for key: ${dataset}`);
                redisClient.setex(dataset, cacheSeconds, JSON.stringify(output));
                res.send(output);
            });
        }
    });
}

const cors = restifyCORSMiddleware({
    origins: ['*'],
});

server.pre(cors.preflight);
server.pre(cors.actual);

server.get('/:dataset', respond);

server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});
