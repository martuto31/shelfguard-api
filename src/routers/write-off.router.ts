import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import WriteOffController from './../controllers/write-off.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const writeOffController = new WriteOffController();

const WriteOffRouter = Router();

WriteOffRouter.get('/expired', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(writeOffController.getExpired));

WriteOffRouter.post('/confirm', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(writeOffController.confirm));

export default WriteOffRouter;
