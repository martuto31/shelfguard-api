import mongoose, { FilterQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { User, UserDoc, IUser } from './../models/user.model';

export default class UserDataLayer {

  private logContext = 'User Data Layer';

  public async create(data: Partial<IUser>, logContext: string): Promise<UserDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await User.create(data)
      .catch(err => {
        if (err.code === 11000) {
          throw new CustomError(400, 'Email already exist');
        }

        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async get(filter: FilterQuery<IUser>, logContext: string, projection: string = '-password'): Promise<UserDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> get()`;

    const user = await User.findOne(filter)
      .select(projection)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return user;
  }

  public async getById(id: string | mongoose.Types.ObjectId, logContext: string, projection: string = '-password'): Promise<UserDoc> {
    logContext = `${logContext} -> ${this.logContext} -> getById()`;

    if (!mongoose.isValidObjectId(id)) {
      throw new CustomError(400, 'Invalid ID');
    }

    const user = await User.findById(id)
      .select(projection)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()}`);
      });

    if (!user) {
      throw new CustomError(404, 'No user found');
    }

    return user;
  }

  private static instance: UserDataLayer;

  public static getInstance(): UserDataLayer {
    if (!UserDataLayer.instance) {
      UserDataLayer.instance = new UserDataLayer();
    }

    return UserDataLayer.instance;
  }

}
