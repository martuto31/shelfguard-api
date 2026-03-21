import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';

import CatchUtil from './../utils/catch.util';

import AuthController from './../controllers/auth.controller';

const authMiddleware = AuthMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const authController = new AuthController();

const AuthRouter = Router();

AuthRouter.post('/register', useCatch(authController.register));

AuthRouter.post('/login', useCatch(authController.login));

AuthRouter.get('/refresh-access-token', useCatch(authController.refreshAccessToken));

AuthRouter.get('/user', useCatch(authMiddleware.isAuthenticated), useCatch(authController.getUser));

export default AuthRouter;
