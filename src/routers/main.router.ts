import { Router } from 'express';

import AuthRouter from './auth.router';

const MainRouter = Router();

MainRouter.use('/api/v1/auth', AuthRouter);

export default MainRouter;
