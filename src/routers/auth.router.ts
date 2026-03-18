import { Router } from 'express';

import AuthController from './../controllers/auth.controller';

import AuthMiddleware from './../middlewares/auth.middleware';

const authController = new AuthController();

const authMiddleware = AuthMiddleware.getInstance();

const AuthRouter = Router();

AuthRouter.post('/register', authController.register);

AuthRouter.post('/login', authController.login);

AuthRouter.get('/refresh-access-token', authController.refreshAccessToken);

AuthRouter.get('/user', authMiddleware.isAuthenticated, authController.getUser);

export default AuthRouter;
