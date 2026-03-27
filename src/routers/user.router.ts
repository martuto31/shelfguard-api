import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import UserController from './../controllers/user.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const userController = new UserController();

const UserRouter = Router();

UserRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER)), useCatch(userController.getAll));

UserRouter.post('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER)), useCatch(userController.create));

UserRouter.put('/:id', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER)), useCatch(userController.update));

export default UserRouter;
