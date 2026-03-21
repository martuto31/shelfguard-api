import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import CustomError from './../utils/custom-error.util';

import UserDataLayer from './../data-layer/user.data-layer';
import OrganizationDataLayer from './../data-layer/organization.data-layer';
import RefreshTokenDataLayer from './../data-layer/refresh-token.data-layer';

import { Role } from './../models/user.model';
import Config from './../config';

export default class AuthController {

  private logContext = 'Auth Controller';
  private config = Config.getInstance();
  private userDataLayer = UserDataLayer.getInstance();
  private organizationDataLayer = OrganizationDataLayer.getInstance();
  private refreshTokenDataLayer = RefreshTokenDataLayer.getInstance();

  public register: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> register()`;
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      throw new CustomError(400, 'Missing fields: name | email | password | organizationName');
    }

    const existingUser = await this.userDataLayer.get({ email }, logContext);

    if (existingUser) {
      throw new CustomError(409, 'Email already exist');
    }

    const organization = await this.organizationDataLayer.create({ name: organizationName }, logContext);

    const user = await this.userDataLayer.create({
      name,
      email,
      password,
      role: Role.OWNER,
      organizationId: organization._id,
    }, logContext);

    const accessToken = this.createAccessJWT(user._id);
    const refreshToken = await this.getRefreshToken(user._id, logContext);

    res.header('Authorization-Access', accessToken);
    res.header('Authorization-Refresh', refreshToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access, Authorization-Refresh');

    res.status(201).json();
  }

  public login: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> login()`;
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError(400, 'Missing fields: email | password');
    }

    const user = await this.userDataLayer.get({ email }, logContext, '+password');

    if (!user) {
      throw new CustomError(404, 'No user found');
    }

    if (!user.active) {
      throw new CustomError(403, 'Account is disabled');
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> bcryptjs.compare()`);
      });

    if (!isPasswordValid) {
      throw new CustomError(401, 'Invalid password');
    }

    const accessToken = this.createAccessJWT(user._id);
    const refreshToken = await this.getRefreshToken(user._id, logContext);

    res.header('Authorization-Access', accessToken);
    res.header('Authorization-Refresh', refreshToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access, Authorization-Refresh');

    res.status(200).json();
  }

  public refreshAccessToken: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> refreshAccessToken()`;
    const headerValue = req.headers['authorization-refresh'];

    if (!headerValue || typeof headerValue !== 'string') {
      throw new CustomError(401, 'Missing refresh token');
    }

    const refreshToken = headerValue.split(' ')[1];

    const userId = await this.getUserIdFromRefreshToken(refreshToken, logContext);

    if (!userId) {
      throw new CustomError(401, 'Invalid refresh token');
    }

    const accessToken = this.createAccessJWT(userId);

    res.header('Authorization-Access', accessToken);
    res.header('Access-Control-Expose-Headers', 'Authorization-Access');

    res.status(200).json();
  }

  public getUser: RequestHandler = async (req, res) => {
    res.status(200).json(req.user);
  }

  private async getRefreshToken(userId: mongoose.Types.ObjectId, logContext: string): Promise<string> {
    const currentToken = await this.refreshTokenDataLayer.get({ userId }, logContext);

    if (currentToken) {
      await this.refreshTokenDataLayer.delete(currentToken._id, logContext);
    }

    const token = this.createRefreshJWT(userId);

    await this.refreshTokenDataLayer.create({
      userId,
      token: 'Bearer ' + token,
    }, logContext);

    return token;
  }

  private async getUserIdFromRefreshToken(token: string, logContext: string): Promise<mongoose.Types.ObjectId | null> {
    const decodedToken = jwt.verify(token, this.config.jwt.refreshSecret);

    if (decodedToken && decodedToken !== 'string' && (decodedToken as JwtPayload).userId) {
      const refreshToken = await this.refreshTokenDataLayer.get({ userId: (decodedToken as JwtPayload).userId }, logContext);

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
