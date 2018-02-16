import restify from 'restify';
import fs from 'fs';

import transpose from './transpose';


const server = restify.createServer();
const port = process.env.PORT || 8000;

function respond(req, res, next) {
    const dataset = req.params.dataset;

    fs.readFile(`manifests/${dataset}.json`, 'utf8', (error, contents) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.send({
                    error: 'No such dataset',
                });
            } else {
                res.send({
                    error: true,
                });
            }
        } else {
            const manifest = JSON.parse(contents);
            transpose(manifest, output => {
                res.send(output);
            });
        }
    });

    next();
}

server.get('/:dataset', respond);

server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});
