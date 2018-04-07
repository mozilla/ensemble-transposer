import childProcess from 'child_process';


export function version(req, res, next) {
    try {
        const version = childProcess.execSync('git tag').toString().trim();
        const commit = childProcess.execSync('git rev-parse HEAD').toString().trim();

        res.send({
            source: "https://github.com/mozilla/ensemble-transposer",
            version,
            commit,
        });
    }
    catch (e) {
        res.send({
            error: true,
        });
    }

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
