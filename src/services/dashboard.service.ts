import mongoose from 'mongoose';

import BatchDataLayer from './../data-layer/batch.data-layer';
import ProductDataLayer from './../data-layer/product.data-layer';
import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

import { MovementType } from './../models/stock-movement.model';

interface DashboardSummary {
  totalProducts: number;
  totalStock: number;
  expiredBatches: number;
  expiredQuantity: number;
  lowStockProducts: number;
  picksThisMonth: number;
}

interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStockThreshold: number;
}

interface ExpiringBatch {
  id: string;
  batchNumber: string;
  productName: string;
  quantityRemaining: number;
  expiryDate: Date;
}

interface DashboardData {
  summary: DashboardSummary;
  lowStockAlerts: LowStockAlert[];
  expiringBatches: ExpiringBatch[];
}

export default class DashboardService {

  private logContext = 'Dashboard Service';
  private batchDataLayer = BatchDataLayer.getInstance();
  private productDataLayer = ProductDataLayer.getInstance();
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public async getDashboard(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<DashboardData> {
    logContext = `${logContext} -> ${this.logContext} -> getDashboard()`;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [products, activeBatches, outMovements] = await Promise.all([
      this.productDataLayer.getMany({ organizationId }, logContext),
      this.batchDataLayer.getMany(
        { organizationId, quantityRemaining: { $gt: 0 } },
        logContext,
        [],
        { expiryDate: 1 },
      ),
      this.stockMovementDataLayer.getMany(
        { organizationId, type: MovementType.OUT, createdAt: { $gte: monthStart } },
        logContext,
      ),
    ]);

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const stockByProductId = new Map<string, number>();

    for (const batch of activeBatches) {
      const key = batch.productId.toString();
      stockByProductId.set(key, (stockByProductId.get(key) || 0) + batch.quantityRemaining);
    }

    const expiredBatches = activeBatches.filter(b => b.expiryDate < now);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    const expiredQuantity = expiredBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    const picksThisMonth = outMovements.reduce((sum, m) => sum + m.quantity, 0);

    const lowStockAlerts: LowStockAlert[] = products
      .filter(p => {
        if (p.minStockThreshold <= 0) return false;

        const stock = stockByProductId.get(p._id.toString()) || 0;

        return stock < p.minStockThreshold;
      })
      .map(p => ({
        productId: p._id.toString(),
        productName: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: stockByProductId.get(p._id.toString()) || 0,
        minStockThreshold: p.minStockThreshold,
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const expiringBatches: ExpiringBatch[] = activeBatches
      .filter(b => b.expiryDate > now && b.expiryDate <= ninetyDays)
      .map(b => {
        const product = productMap.get(b.productId.toString());

        return {
          id: b._id.toString(),
          batchNumber: b.batchNumber,
          productName: product?.name || '',
          quantityRemaining: b.quantityRemaining,
          expiryDate: b.expiryDate,
        };
      });

    return {
      summary: {
        totalProducts: products.length,
        totalStock,
        expiredBatches: expiredBatches.length,
        expiredQuantity,
        lowStockProducts: lowStockAlerts.length,
        picksThisMonth,
      },
      lowStockAlerts,
      expiringBatches,
    };
  }

  private static instance: DashboardService;

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }

    return DashboardService.instance;
  }

}

export { DashboardData };
