import { Router } from 'express';

import AuthRouter from './auth.router';
import ProductRouter from './product.router';

const MainRouter = Router();

MainRouter.use('/api/v1/auth', AuthRouter);

MainRouter.use('/api/v1/products', ProductRouter);

export default MainRouter;
