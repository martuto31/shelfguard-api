import { Router } from 'express';

import AuthRouter from './auth.router';
import SupplierRouter from './supplier.router';
import ProductRouter from './product.router';
import BatchRouter from './batch.router';
import PickRouter from './pick.router';
import MovementRouter from './movement.router';

const MainRouter = Router();

MainRouter.use('/api/v1/auth', AuthRouter);

MainRouter.use('/api/v1/suppliers', SupplierRouter);

MainRouter.use('/api/v1/products', ProductRouter);

MainRouter.use('/api/v1/batches', BatchRouter);

MainRouter.use('/api/v1/picks', PickRouter);

MainRouter.use('/api/v1/movements', MovementRouter);

export default MainRouter;
