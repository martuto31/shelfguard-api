import mongoose from 'mongoose';

import BatchDataLayer from './../data-layer/batch.data-layer';
import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

import { MovementType } from './../models/stock-movement.model';

interface PickSuggestion {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantityToPick: number;
  quantityRemainingAfter: number;
}

interface PickResult {
  suggestions: PickSuggestion[];
  totalQuantity: number;
}

export default class FefoService {

  private logContext = 'Fefo Service';
  private batchDataLayer = BatchDataLayer.getInstance();
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public async getSuggestions(productId: string, quantity: number, organizationId: mongoose.Types.ObjectId, logContext: string): Promise<PickResult | null> {
    logContext = `${logContext} -> ${this.logContext} -> getSuggestions()`;
    const now = new Date();

    const batches = await this.batchDataLayer.getMany(
      { productId, organizationId, quantityRemaining: { $gt: 0 }, expiryDate: { $gt: now } },
      logContext,
      [],
      { expiryDate: 1 },
    );

    if (batches.length === 0) {
      return null;
    }

    const suggestions: PickSuggestion[] = [];
    let remaining = quantity;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const quantityToPick = Math.min(remaining, batch.quantityRemaining);

      suggestions.push({
        batchId: batch._id.toString(),
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityToPick,
        quantityRemainingAfter: batch.quantityRemaining - quantityToPick,
      });

      remaining -= quantityToPick;
    }

    return {
      suggestions,
      totalQuantity: quantity - remaining,
    };
  }

  public async confirmPick(
    suggestions: PickSuggestion[],
    productId: string,
    userId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    logContext: string,
  ): Promise<boolean> {
    logContext = `${logContext} -> ${this.logContext} -> confirmPick()`;

    for (const suggestion of suggestions) {
      const batch = await this.batchDataLayer.updateByFilter(
        { _id: suggestion.batchId, organizationId, quantityRemaining: { $gte: suggestion.quantityToPick } },
        { $inc: { quantityRemaining: -suggestion.quantityToPick } },
        logContext,
      );

      if (!batch) {
        return false;
      }

      await this.stockMovementDataLayer.create({
        batchId: new mongoose.Types.ObjectId(suggestion.batchId),
        productId: new mongoose.Types.ObjectId(productId),
        type: MovementType.OUT,
        quantity: suggestion.quantityToPick,
        reason: 'FEFO pick',
        performedBy: userId,
        organizationId,
      }, logContext);
    }

    return true;
  }

  private static instance: FefoService;

  public static getInstance(): FefoService {
    if (!FefoService.instance) {
      FefoService.instance = new FefoService();
    }

    return FefoService.instance;
  }

}

export { PickSuggestion, PickResult };
