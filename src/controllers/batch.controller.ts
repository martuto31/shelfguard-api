import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import BatchDataLayer from './../data-layer/batch.data-layer';
import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

import { MovementType } from './../models/stock-movement.model';

export default class BatchController {

  private logContext = 'Batch Controller';
  private batchDataLayer = BatchDataLayer.getInstance();
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public create: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> create()`;
    const { productId, batchNumber, quantity, expiryDate, supplierId, notes } = req.body;

    if (!productId || !batchNumber || !quantity || !expiryDate) {
      throw new CustomError(400, 'Missing fields: productId | batchNumber | quantity | expiryDate');
    }

    const batch = await this.batchDataLayer.create({
      productId,
      batchNumber,
      quantityReceived: quantity,
      quantityRemaining: quantity,
      expiryDate,
      supplierId,
      notes,
      organizationId: req.user.organizationId,
    }, logContext);

    await this.stockMovementDataLayer.create({
      batchId: batch._id,
      productId,
      type: MovementType.IN,
      quantity,
      reason: 'Stock received',
      performedBy: req.user._id,
      organizationId: req.user.organizationId,
    }, logContext);

    res.status(201).json(batch);
  }

  public update: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> update()`;
    const id = req.params.id as string;
    const { batchNumber, expiryDate, notes } = req.body;

    const batch = await this.batchDataLayer.updateById(id, { batchNumber, expiryDate, notes }, logContext);

    res.status(200).json(batch);
  }

  public getExpiring: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getExpiring()`;
    const days = parseInt(req.query.days as string) || 30;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const batches = await this.batchDataLayer.getMany(
      { organizationId: req.user.organizationId, quantityRemaining: { $gt: 0 }, expiryDate: { $lte: futureDate } },
      logContext,
      ['productId', 'supplierId'],
      { expiryDate: 1 },
    );

    res.status(200).json(batches);
  }

}
