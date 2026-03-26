import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';

import CatchUtil from './../utils/catch.util';

import DashboardController from './../controllers/dashboard.controller';

const authMiddleware = AuthMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const dashboardController = new DashboardController();

const DashboardRouter = Router();

DashboardRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(dashboardController.get));

export default DashboardRouter;
