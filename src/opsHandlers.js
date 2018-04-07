import fs from 'fs';


export function version(req, res, next) {
    fs.readFile('./build/version.json', 'utf8', (error, contents) => {
        if (error) {
            res.send({ error: true });
        } else {
            res.send(JSON.parse(contents));
        }

        return next();
    });
}

export function heartbeat(req, res, next, redisClient) {
    if (redisClient.connected) {
        res.send(200);
    } else {
        res.send(500);
    }

    return next();
}

export function lbheartbeat(req, res, next) {
    res.send(200);
    return next();
}
