import { Router } from 'express';

import AuthRouter from './auth.router';
import ProductRouter from './product.router';
import SupplierRouter from './supplier.router';

const MainRouter = Router();

MainRouter.use('/api/v1/auth', AuthRouter);

MainRouter.use('/api/v1/products', ProductRouter);

MainRouter.use('/api/v1/suppliers', SupplierRouter);

export default MainRouter;
