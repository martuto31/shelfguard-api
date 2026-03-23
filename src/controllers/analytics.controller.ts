import { RequestHandler } from 'express';

import AnalyticsService from './../services/analytics.service';

export default class AnalyticsController {

  private logContext = 'Analytics Controller';
  private analyticsService = AnalyticsService.getInstance();

  public get: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> get()`;

    const data = await this.analyticsService.getAnalytics(req.user.organizationId, logContext);

    res.status(200).json(data);
  }

}
