import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import BatchController from './../controllers/batch.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const batchController = new BatchController();

const BatchRouter = Router();

BatchRouter.post('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(batchController.create));

BatchRouter.put('/:id', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(batchController.update));

BatchRouter.get('/expiring', useCatch(authMiddleware.isAuthenticated), useCatch(batchController.getExpiring));

export default BatchRouter;
