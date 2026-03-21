import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import { Role } from './../models/user.model';

export default class RoleMiddleware {

  public requireRole(...roles: Role[]): RequestHandler {
    return async (req, res, next) => {
      if (!req.user) {
        throw new CustomError(401, 'Missing access token');
      }

      if (!roles.includes(req.user.role)) {
        throw new CustomError(403, 'Insufficient permissions');
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
