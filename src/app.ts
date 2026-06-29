import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { json } from 'body-parser';

import loggerPino from 'pino';

import MainRouter from './routers/main.router';

import ErrorMiddleware from './middlewares/error.middleware';

import Config from './config';

const app = express();
const config = Config.getInstance();
const logger = loggerPino();

app.use(cors());
app.use(json());
app.use(MainRouter);
app.use(new ErrorMiddleware().init);

const port = config.server.port;
app.listen(port, '0.0.0.0', () => {
    logger.info(`Server Started — listening on 0.0.0.0:${port} (process.env.PORT=${process.env.PORT ?? 'UNSET'})`);
});

mongoose.connect(config.databaseUri)
    .then(() => {
        logger.info('DB Connected');
    })
    .catch(err => { logger.error(err, 'DB Connection Error') });

mongoose.connection.on('error', err => logger.error(err, `DB Error: ${err}`));
