import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import FefoService from './../services/fefo.service';

export default class PickController {

  private logContext = 'Pick Controller';
  private fefoService = FefoService.getInstance();

  public suggest: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> suggest()`;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      throw new CustomError(400, 'Missing fields: productId | quantity');
    }

    const result = await this.fefoService.getSuggestions(
      productId,
      quantity,
      req.user.organizationId,
      logContext,
    );

    if (!result || result.suggestions.length === 0) {
      throw new CustomError(404, 'No available batches found');
    }

    res.status(200).json(result);
  }

  public confirm: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> confirm()`;
    const { productId, suggestions } = req.body;

    if (!productId || !suggestions || suggestions.length === 0) {
      throw new CustomError(400, 'Missing fields: productId | suggestions');
    }

    const success = await this.fefoService.confirmPick(
      suggestions,
      productId,
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
