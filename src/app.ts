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

app.listen(config.server.port, () => {
    logger.info('Server Started');
});

mongoose.connect(config.databaseUri)
    .then(() => {
        logger.info('DB Connected');
    })
    .catch(err => { logger.error(err, 'DB Connection Error') });

mongoose.connection.on('error', err => logger.error(err, `DB Error: ${err}`));
