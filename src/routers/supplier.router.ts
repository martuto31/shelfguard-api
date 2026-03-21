import { Router } from 'express';

import AuthMiddleware from './../middlewares/auth.middleware';
import RoleMiddleware from './../middlewares/role.middleware';

import CatchUtil from './../utils/catch.util';

import SupplierController from './../controllers/supplier.controller';

import { Role } from './../models/user.model';

const authMiddleware = AuthMiddleware.getInstance();
const roleMiddleware = RoleMiddleware.getInstance();

const useCatch = CatchUtil.getUseCatch();
const supplierController = new SupplierController();

const SupplierRouter = Router();

SupplierRouter.get('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(supplierController.getAll));

SupplierRouter.post('/', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(supplierController.create));

SupplierRouter.put('/:id', useCatch(authMiddleware.isAuthenticated), useCatch(roleMiddleware.requireRole(Role.OWNER, Role.MANAGER)), useCatch(supplierController.update));

export default SupplierRouter;
