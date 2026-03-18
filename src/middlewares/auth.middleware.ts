import mongoose from 'mongoose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RequestHandler, Request } from 'express';

import loggerPino from 'pino';

import { User, UserDoc } from './../models/user.model';

import Config from './../config';

declare global {
  namespace Express {
    interface Request {
      user: UserDoc
    }
  }
}

export default class AuthMiddleware {

  private logger = loggerPino();
  private config = Config.getInstance();

  public isAuthenticated: RequestHandler = async (req, res, next) => {
    const accessToken = this.getAccessTokenFromHeaders(req);

    if (!accessToken) {
      return next(res.status(401).json());
    }

    try {
      const userId = this.getUserIdFromAccessToken(accessToken);
      const user = await User.findOne({ _id: userId })
        .catch(err => {
          this.logger.error(err, 'User.findOne');
        });

      if (!user) {
        res.status(401).json()

        return;
      }

      if (!user.active) {
        res.status(403).json()

        return;
      }

      req.user = user;

      next();
    } catch (err) {
      next(res.status(498).json());
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
