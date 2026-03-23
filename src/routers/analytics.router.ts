import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import AnalyticsController from './../controllers/analytics.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const analyticsController = new AnalyticsController();

const AnalyticsRouter = Router();

AnalyticsRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(analyticsController.get));

export default AnalyticsRouter;
