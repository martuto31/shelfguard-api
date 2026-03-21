import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import ProductController from './../controllers/product.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const productController = new ProductController();

const ProductRouter = Router();

ProductRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(productController.getAll));

ProductRouter.post('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(productController.create));

ProductRouter.put('/:id', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(productController.update));

ProductRouter.delete('/:id', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(productController.delete));

ProductRouter.get('/:id/batches', useCatch(authMiddleware.isAuthenticated), useCatch(productController.getBatches));

export default ProductRouter;
