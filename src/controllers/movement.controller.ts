import { RequestHandler } from 'express';

import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

export default class MovementController {

  private logContext = 'Movement Controller';
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public getAll: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getAll()`;

    const movements = await this.stockMovementDataLayer.getMany(
      { organizationId: req.user.organizationId },
      logContext,
      ['batchId', 'productId', 'performedBy'],
      { createdAt: -1 },
    );

    res.status(200).json(movements);
  }

}
