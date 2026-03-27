import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import UserDataLayer from './../data-layer/user.data-layer';

import { Role } from './../models/user.model';

export default class UserController {

  private logContext = 'User Controller';
  private userDataLayer = UserDataLayer.getInstance();

  public getAll: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getAll()`;

    const users = await this.userDataLayer.getMany({ organizationId: req.user.organizationId }, logContext);

    res.status(200).json(users);
  }

  public create: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> create()`;
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      throw new CustomError(400, 'Missing fields: name | email | password | role');
    }

    if (!Object.values(Role).includes(role)) {
      throw new CustomError(400, 'Invalid role');
    }

    const existing = await this.userDataLayer.get({ email }, logContext);

    if (existing) {
      throw new CustomError(409, 'Email already exist');
    }

    const user = await this.userDataLayer.create({
      name,
      email,
      password,
      role,
      organizationId: req.user.organizationId,
    }, logContext);

    res.status(201).json(user);
  }

  public update: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> update()`;
    const id = req.params.id as string;
    const { name, role, active } = req.body;

    const isSelf = id === req.user._id.toString();

    if (isSelf && role !== undefined) {
      throw new CustomError(400, 'Cannot change own role');
    }

    if (isSelf && active === false) {
      throw new CustomError(400, 'Cannot deactivate own account');
    }

    if (role !== undefined && !Object.values(Role).includes(role)) {
      throw new CustomError(400, 'Invalid role');
    }

    const update: Record<string, unknown> = {};

    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (active !== undefined) update.active = active;

    const user = await this.userDataLayer.updateById(id, update, logContext);

    res.status(200).json(user);
  }

}
