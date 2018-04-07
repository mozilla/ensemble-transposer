import childProcess from 'child_process';


export function version(req, res, next) {
    res.send({
        source: "https://github.com/mozilla/ensemble-transposer",
        commit: process.env.SOURCE_VERSION || childProcess.execSync('git rev-parse HEAD').toString().trim();
    });

    return next();
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
