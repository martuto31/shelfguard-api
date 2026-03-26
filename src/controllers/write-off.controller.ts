import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import WriteOffService from './../services/write-off.service';

export default class WriteOffController {

  private logContext = 'WriteOff Controller';
  private writeOffService = WriteOffService.getInstance();

  public getExpired: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getExpired()`;

    const batches = await this.writeOffService.getExpiredBatches(
      req.user.organizationId,
      logContext,
    );

    res.status(200).json(batches);
  }

  public confirm: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> confirm()`;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new CustomError(400, 'Missing field: items');
    }

    for (const item of items) {
      if (!item.batchId || !item.productId || !item.quantity || item.quantity <= 0 || !item.reason) {
        throw new CustomError(400, 'Each item must have: batchId, productId, quantity (>0), reason');
      }
    }

    const success = await this.writeOffService.confirmWriteOff(
      items,
      req.user._id,
      req.user.organizationId,
      logContext,
    );

    if (!success) {
      throw new CustomError(409, 'Stock has changed, please retry');
    }

    res.status(200).json();
  }

}
