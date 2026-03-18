import { RequestHandler } from 'express';

import loggerPino from 'pino';

import { Role } from './../models/user.model';

export default class RoleMiddleware {

  private logger = loggerPino();

  public requireRole(...roles: Role[]): RequestHandler {
    return async (req, res, next) => {
      const user = req.user;

      if (!user) {
        res.status(401).json();

        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json();

        return;
      }

      next();
    };
  }

  private static instance: RoleMiddleware;

  public static getInstance(): RoleMiddleware {
    if (!RoleMiddleware.instance) {
      RoleMiddleware.instance = new RoleMiddleware();
    }

    return RoleMiddleware.instance;
  }

}
