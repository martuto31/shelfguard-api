import mongoose, { FilterQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { RefreshToken, RefreshTokenDoc, IRefreshToken } from './../models/refresh-token.model';

export default class RefreshTokenDataLayer {

  private logContext = 'RefreshToken Data Layer';

  public async create(data: Partial<IRefreshToken>, logContext: string): Promise<RefreshTokenDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await RefreshToken.create(data)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async get(filter: FilterQuery<IRefreshToken>, logContext: string): Promise<RefreshTokenDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> get()`;

    const refreshToken = await RefreshToken.findOne(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return refreshToken;
  }

  public async delete(id: string | mongoose.Types.ObjectId, logContext: string): Promise<void> {
    logContext = `${logContext} -> ${this.logContext} -> delete()`;

    await RefreshToken.deleteOne({ _id: id })
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()}`);
      });
  }

  private static instance: RefreshTokenDataLayer;

  public static getInstance(): RefreshTokenDataLayer {
    if (!RefreshTokenDataLayer.instance) {
      RefreshTokenDataLayer.instance = new RefreshTokenDataLayer();
    }

    return RefreshTokenDataLayer.instance;
  }

}
