import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';

import CatchUtil from './../utils/catch.util';

import PickController from './../controllers/pick.controller';

const authMiddleware = AuthMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const pickController = new PickController();

const PickRouter = Router();

PickRouter.post('/suggest', useCatch(authMiddleware.isAuthenticated), useCatch(pickController.suggest));

PickRouter.post('/confirm', useCatch(authMiddleware.isAuthenticated), useCatch(pickController.confirm));

export default PickRouter;
