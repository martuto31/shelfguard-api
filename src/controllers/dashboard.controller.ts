import { RequestHandler } from 'express';

import DashboardService from './../services/dashboard.service';

export default class DashboardController {

  private logContext = 'Dashboard Controller';
  private dashboardService = DashboardService.getInstance();

  public get: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> get()`;

    const data = await this.dashboardService.getDashboard(req.user.organizationId, logContext);

    res.status(200).json(data);
  }

}
