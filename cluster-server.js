import cluster from 'cluster';
import { cpus } from 'os';
import { Server } from './build/server/index.js';
import express from 'express';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} spawning ${numCPUs} workers…`);
    for (let i = 0; i < numCPUs; i++) cluster.fork();
    cluster.on('exit', (w) => {
        console.warn(`Worker ${w.process.pid} died — restarting…`);
        cluster.fork();
    });
} else {
    const app = express();

    const server = new Server();

    app.use(server.handler);

    const port = process.env.PORT || 3000;
    app.listen(port, () =>
        console.log(`Worker ${process.pid} listening on ${port}`)
    );
}