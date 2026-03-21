import { ErrorRequestHandler } from 'express';

import loggerPino from 'pino';

import CustomError from './../utils/custom-error.util';

export default class ErrorMiddleware {

  private logger = loggerPino();

  public init: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof CustomError) {
      this.log(err);

      const status = err.status || 500;
      let message = err.message || 'Something went wrong. Please try again later.';

      if (status === 500) {
        message = 'Internal Server Error.';
      }

      res.status(status).json({ message });

      return;
    }

    this.logger.error(err);

    res.status(500).json({ message: 'Internal Server Error.' });
  }

  private log(err: CustomError): void {
    if (err.source) {
      this.logger.error({ source: err.source }, err.message);
    }
  }

}
