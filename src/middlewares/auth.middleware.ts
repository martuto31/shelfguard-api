import mongoose from 'mongoose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RequestHandler, Request } from 'express';

import CustomError from './../utils/custom-error.util';

import UserDataLayer from './../data-layer/user.data-layer';
import { UserDoc } from './../models/user.model';

import Config from './../config';

declare global {
  namespace Express {
    interface Request {
      user: UserDoc
    }
  }
}

export default class AuthMiddleware {

  private logContext = 'Auth Middleware';
  private config = Config.getInstance();
  private userDataLayer = UserDataLayer.getInstance();

  public isAuthenticated: RequestHandler = async (req, res, next) => {
    const logContext = `${this.logContext} -> isAuthenticated()`;
    const accessToken = this.getAccessTokenFromHeaders(req);

    if (!accessToken) {
      throw new CustomError(401, 'Missing access token');
    }

    try {
      const userId = this.getUserIdFromAccessToken(accessToken);

      const user = await this.userDataLayer.getById(userId!, logContext);

      if (!user.active) {
        throw new CustomError(403, 'Account is disabled');
      }

      req.user = user;

      next();
    } catch (err) {
      if (err instanceof CustomError) {
        throw err;
      }

      throw new CustomError(498, 'Invalid or expired token');
    }
  }

  private getAccessTokenFromHeaders(req: Request): string | undefined {
    let headerValue;
    let accessToken;

    if (req.headers['authorization']) {
      headerValue = req.headers['authorization'];
    } else if (req.query['authorization']) {
      headerValue = req.query['authorization'];
    }

    if (headerValue && typeof headerValue === 'string') {
      accessToken = headerValue.split(' ')[1];
    }

    return accessToken;
  }

  private getUserIdFromAccessToken(token: string): mongoose.Types.ObjectId | null {
    const decodedToken = jwt.verify(token, this.config.jwt.accessSecret);

    if (decodedToken && decodedToken !== 'string' && (decodedToken as JwtPayload).userId) {
      return (decodedToken as JwtPayload).userId;
    }

    return null;
  }

  private static instance: AuthMiddleware;

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }

    return AuthMiddleware.instance;
  }

}
