import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';

import CatchUtil from './../utils/catch.util';

import MovementController from './../controllers/movement.controller';

const authMiddleware = AuthMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const movementController = new MovementController();

const MovementRouter = Router();

MovementRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(movementController.getAll));

export default MovementRouter;
