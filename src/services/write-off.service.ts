import mongoose from 'mongoose';

import BatchDataLayer from './../data-layer/batch.data-layer';
import ProductDataLayer from './../data-layer/product.data-layer';
import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

import { MovementType } from './../models/stock-movement.model';

interface ExpiredBatchItem {
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantityRemaining: number;
  expiryDate: Date;
  daysExpired: number;
}

interface WriteOffItem {
  batchId: string;
  productId: string;
  quantity: number;
  reason: string;
}

export default class WriteOffService {

  private logContext = 'WriteOff Service';
  private batchDataLayer = BatchDataLayer.getInstance();
  private productDataLayer = ProductDataLayer.getInstance();
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public async getExpiredBatches(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<ExpiredBatchItem[]> {
    logContext = `${logContext} -> ${this.logContext} -> getExpiredBatches()`;
    const now = new Date();

    const [batches, products] = await Promise.all([
      this.batchDataLayer.getMany(
        { organizationId, quantityRemaining: { $gt: 0 }, expiryDate: { $lte: now } },
        logContext,
        [],
        { expiryDate: 1 },
      ),
      this.productDataLayer.getMany({ organizationId }, logContext),
    ]);

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    return batches.map(batch => {
      const product = productMap.get(batch.productId.toString());
      const daysExpired = Math.ceil((now.getTime() - new Date(batch.expiryDate).getTime()) / (1000 * 60 * 60 * 24));

      return {
        batchId: batch._id.toString(),
        batchNumber: batch.batchNumber,
        productId: batch.productId.toString(),
        productName: product?.name || 'Неизвестен',
        sku: product?.sku || '',
        unit: product?.unit || 'pcs',
        quantityRemaining: batch.quantityRemaining,
        expiryDate: batch.expiryDate,
        daysExpired,
      };
    });
  }

  public async confirmWriteOff(
    items: WriteOffItem[],
    userId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    logContext: string,
  ): Promise<boolean> {
    logContext = `${logContext} -> ${this.logContext} -> confirmWriteOff()`;

    const completed: { batchId: string; quantity: number }[] = [];

    for (const item of items) {
      const batch = await this.batchDataLayer.updateByFilter(
        { _id: item.batchId, organizationId, quantityRemaining: { $gte: item.quantity } },
        { $inc: { quantityRemaining: -item.quantity } },
        logContext,
      );

      if (!batch) {
        await this.rollback(completed, organizationId, logContext);

        return false;
      }

      completed.push({ batchId: item.batchId, quantity: item.quantity });

      await this.stockMovementDataLayer.create({
        batchId: new mongoose.Types.ObjectId(item.batchId),
        productId: new mongoose.Types.ObjectId(item.productId),
        type: MovementType.ADJUSTMENT,
        quantity: item.quantity,
        reason: item.reason,
        performedBy: userId,
        organizationId,
      }, logContext);
    }

    return true;
  }

  private async rollback(completed: { batchId: string; quantity: number }[], organizationId: mongoose.Types.ObjectId, logContext: string): Promise<void> {
    for (const entry of completed) {
      await this.batchDataLayer.updateByFilter(
        { _id: entry.batchId, organizationId },
        { $inc: { quantityRemaining: entry.quantity } },
        logContext,
      );
    }
  }

  private static instance: WriteOffService;

  public static getInstance(): WriteOffService {
    if (!WriteOffService.instance) {
      WriteOffService.instance = new WriteOffService();
    }

    return WriteOffService.instance;
  }

}

export { ExpiredBatchItem, WriteOffItem };
