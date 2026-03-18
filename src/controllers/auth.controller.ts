import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import loggerPino from 'pino';

import { User } from './../models/user.model';
import { Organization } from './../models/organization.model';
import { RefreshToken } from './../models/refresh-token.model';

import Config from './../config';

export default class AuthController {

  private logger = loggerPino();
  private config = Config.getInstance();

  public register: RequestHandler = async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      res.status(400).json();

      return;
    }

    const existingUser = await User.findOne({ email })
      .catch(err => {
        this.logger.error(err, 'User.findOne');
      });

    if (existingUser) {
      res.status(409).json();

      return;
    }

    const organization = await Organization.create({ name: organizationName })
      .catch(err => {
        this.logger.error(err, 'Organization.create');
      });

    if (!organization) {
      res.status(500).json();

      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'OWNER',
      organizationId: organization._id,
    }).catch(err => {
      this.logger.error(err, 'User.create');
    });

    if (!user) {
      res.status(500).json();

      return;
    }

    const accessToken = this.createAccessJWT(user._id);
    const refreshToken = await this.getRefreshToken(user._id);

    res.header('Authorization-Access', accessToken);
    res.header('Authorization-Refresh', refreshToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access, Authorization-Refresh');

    res.status(201).json();
  }

  public login: RequestHandler = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(404).json();

      return;
    }

    const user = await User.findOne({ email })
      .catch(err => {
        this.logger.error(err, 'User.findOne');
      });

    if (!user) {
      res.status(404).json();

      return;
    }

    if (!user.active) {
      res.status(403).json();

      return;
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
      .catch(err => {
        this.logger.error(err, 'bcryptjs.compare');
      });

    if (!isPasswordValid) {
      res.status(401).json();

      return;
    }

    const accessToken = this.createAccessJWT(user._id);
    const refreshToken = await this.getRefreshToken(user._id);

    res.header('Authorization-Access', accessToken);
    res.header('Authorization-Refresh', refreshToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access, Authorization-Refresh');

    res.status(200).json();
  }

  public refreshAccessToken: RequestHandler = async (req, res) => {
    const headers = req.headers;
    const headerValue = headers['authorization-refresh'];

    if (!headers || typeof headerValue !== 'string') {
      res.status(401).json();

      return;
    }

    const refreshToken = headerValue.split(' ')[1];

    const userId = await this.getUserIdFromRefreshToken(refreshToken)
      .catch(err => {
        this.logger.error(err, 'this.getUserIdFromRefreshToken');
      });

    if (!userId) {
      res.status(401).json();

      return;
    }

    const accessToken = this.createAccessJWT(userId);

    res.header('Authorization-Access', accessToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access');

    res.status(200).json();
  }

  public getUser: RequestHandler = async (req, res) => {
    const user = req.user;

    if (!user) {
      res.status(401).json();

      return;
    }

    res.status(200).json(user);
  }

  private async getRefreshToken(userId: mongoose.Types.ObjectId): Promise<string> {
    const currentToken = await RefreshToken.findOne({ userId })
      .catch(err => {
        this.logger.error(err, 'RefreshToken.findOne');
      });

    if (currentToken) {
      await RefreshToken.deleteOne({ _id: currentToken._id })
        .catch(err => {
          this.logger.error(err, 'RefreshToken.deleteOne');
        });
    }

    const token = this.createRefreshJWT(userId);

    const createRefreshToken = {
      userId,
      token: 'Bearer ' + token,
    };

    await RefreshToken.create(createRefreshToken)
      .catch(err => {
        this.logger.error(err, 'RefreshToken.create');
      });

    return token;
  }

  private async getUserIdFromRefreshToken(token: string): Promise<mongoose.Types.ObjectId | null> {
    const decodedToken = jwt.verify(token, this.config.jwt.refreshSecret);

    if (decodedToken && decodedToken !== 'string' && (decodedToken as JwtPayload).userId) {
      const refreshToken = await RefreshToken.findOne({ userId: (decodedToken as JwtPayload).userId })
        .catch(err => {
          this.logger.error(err, 'RefreshToken.findOne');
        });

      if (refreshToken && refreshToken.token === 'Bearer ' + token) {
        return (decodedToken as JwtPayload).userId;
      }
    }

    return null;
  }

  private createAccessJWT(userId: mongoose.Types.ObjectId): string {
    return 'Bearer ' + jwt.sign({ userId }, this.config.jwt.accessSecret, { expiresIn: '60m' });
  }

  private createRefreshJWT(userId: mongoose.Types.ObjectId): string {
    return 'Bearer ' + jwt.sign({ userId }, this.config.jwt.refreshSecret, { expiresIn: '12h' });
  }

}
