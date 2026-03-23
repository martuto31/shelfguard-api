import mongoose from 'mongoose';

import BatchDataLayer from './../data-layer/batch.data-layer';
import ProductDataLayer from './../data-layer/product.data-layer';
import SupplierDataLayer from './../data-layer/supplier.data-layer';
import StockMovementDataLayer from './../data-layer/stock-movement.data-layer';

interface AnalyticsSummary {
  totalProducts: number;
  totalStock: number;
  expiredBatches: number;
  expiredQuantity: number;
  lowStockProducts: number;
  picksThisMonth: number;
  wasteRate: number;
}

interface StockByProduct {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  totalRemaining: number;
  minStockThreshold: number;
  isLowStock: boolean;
  activeBatches: number;
  earliestExpiry: Date | null;
}

interface ExpiryRiskLevel {
  count: number;
  quantity: number;
}

interface ExpiryRisk {
  expired: ExpiryRiskLevel;
  critical: ExpiryRiskLevel;
  warning: ExpiryRiskLevel;
  monitor: ExpiryRiskLevel;
  safe: ExpiryRiskLevel;
}

interface WasteByProduct {
  productId: string;
  productName: string;
  sku: string;
  totalReceived: number;
  totalWasted: number;
  wasteRate: number;
}

interface SupplierScore {
  supplierId: string;
  supplierName: string;
  totalBatches: number;
  avgShelfLifeDays: number;
  wastedQuantity: number;
}

interface MonthlyMovement {
  month: string;
  totalIn: number;
  totalOut: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  stockByProduct: StockByProduct[];
  expiryRisk: ExpiryRisk;
  wasteByProduct: WasteByProduct[];
  supplierPerformance: SupplierScore[];
  movementsByMonth: MonthlyMovement[];
}

export default class AnalyticsService {

  private logContext = 'Analytics Service';
  private batchDataLayer = BatchDataLayer.getInstance();
  private productDataLayer = ProductDataLayer.getInstance();
  private supplierDataLayer = SupplierDataLayer.getInstance();
  private stockMovementDataLayer = StockMovementDataLayer.getInstance();

  public async getAnalytics(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<AnalyticsData> {
    logContext = `${logContext} -> ${this.logContext} -> getAnalytics()`;

    const [products, batches, suppliers, movements] = await Promise.all([
      this.productDataLayer.getMany({ organizationId }, logContext),
      this.batchDataLayer.getMany({ organizationId }, logContext),
      this.supplierDataLayer.getMany({ organizationId }, logContext),
      this.stockMovementDataLayer.getMany({ organizationId }, logContext, [], { createdAt: -1 }),
    ]);

    const now = new Date();

    const activeBatches = batches.filter(b => b.quantityRemaining > 0);
    const expiredBatches = activeBatches.filter(b => b.expiryDate < now);

    const batchesByProduct = this.groupBy(batches, b => b.productId.toString());
    const activeBatchesByProduct = this.groupBy(activeBatches, b => b.productId.toString());
    const batchesBySupplier = this.groupBy(batches, b => b.supplierId?.toString() || '');

    const summary = this.computeSummary(products, activeBatches, expiredBatches, batches, movements, now);
    const stockByProduct = this.computeStockByProduct(products, activeBatchesByProduct);
    const expiryRisk = this.computeExpiryRisk(activeBatches, now);
    const wasteByProduct = this.computeWasteByProduct(products, batchesByProduct, now);
    const supplierPerformance = this.computeSupplierPerformance(suppliers, batchesBySupplier, now);
    const movementsByMonth = this.computeMovementsByMonth(movements);

    return { summary, stockByProduct, expiryRisk, wasteByProduct, supplierPerformance, movementsByMonth };
  }

  private groupBy(items: any[], keyFn: (item: any) => string): Map<string, any[]> {
    const map = new Map<string, any[]>();

    for (const item of items) {
      const key = keyFn(item);
      const group = map.get(key);

      if (group) {
        group.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    return map;
  }

  private computeSummary(
    products: any[],
    activeBatches: any[],
    expiredBatches: any[],
    allBatches: any[],
    movements: any[],
    now: Date,
  ): AnalyticsSummary {
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    const expiredQuantity = expiredBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    const totalReceived = allBatches.reduce((sum, b) => sum + b.quantityReceived, 0);
    const wasteRate = totalReceived > 0 ? (expiredQuantity / totalReceived) * 100 : 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const picksThisMonth = movements
      .filter(m => m.type === 'OUT' && m.createdAt >= monthStart)
      .reduce((sum, m) => sum + m.quantity, 0);

    const stockByProductId = new Map<string, number>();

    for (const batch of activeBatches) {
      const key = batch.productId.toString();
      stockByProductId.set(key, (stockByProductId.get(key) || 0) + batch.quantityRemaining);
    }

    const lowStockProducts = products.filter(p => {
      if (p.minStockThreshold <= 0) return false;

      const stock = stockByProductId.get(p._id.toString()) || 0;

      return stock < p.minStockThreshold;
    }).length;

    return {
      totalProducts: products.length,
      totalStock,
      expiredBatches: expiredBatches.length,
      expiredQuantity,
      lowStockProducts,
      picksThisMonth,
      wasteRate: Math.round(wasteRate * 10) / 10,
    };
  }

  private computeStockByProduct(products: any[], activeBatchesByProduct: Map<string, any[]>): StockByProduct[] {
    return products.map(product => {
      const pid = product._id.toString();
      const productBatches = activeBatchesByProduct.get(pid) || [];
      const totalRemaining = productBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);

      const earliestExpiry = productBatches.length > 0
        ? productBatches.reduce((min, b) => b.expiryDate < min ? b.expiryDate : min, productBatches[0].expiryDate)
        : null;

      return {
        productId: pid,
        productName: product.name,
        sku: product.sku,
        category: product.category || '',
        unit: product.unit,
        totalRemaining,
        minStockThreshold: product.minStockThreshold,
        isLowStock: product.minStockThreshold > 0 && totalRemaining < product.minStockThreshold,
        activeBatches: productBatches.length,
        earliestExpiry,
      };
    })
    .filter(s => s.activeBatches > 0 || s.minStockThreshold > 0)
    .sort((a, b) => {
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;
      if (a.earliestExpiry && b.earliestExpiry) {
        return new Date(a.earliestExpiry).getTime() - new Date(b.earliestExpiry).getTime();
      }

      return 0;
    });
  }

  private computeExpiryRisk(activeBatches: any[], now: Date): ExpiryRisk {
    const risk: ExpiryRisk = {
      expired: { count: 0, quantity: 0 },
      critical: { count: 0, quantity: 0 },
      warning: { count: 0, quantity: 0 },
      monitor: { count: 0, quantity: 0 },
      safe: { count: 0, quantity: 0 },
    };

    for (const batch of activeBatches) {
      const days = Math.ceil((batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const qty = batch.quantityRemaining;

      if (days <= 0) {
        risk.expired.count++;
        risk.expired.quantity += qty;
      } else if (days <= 7) {
        risk.critical.count++;
        risk.critical.quantity += qty;
      } else if (days <= 30) {
        risk.warning.count++;
        risk.warning.quantity += qty;
      } else if (days <= 90) {
        risk.monitor.count++;
        risk.monitor.quantity += qty;
      } else {
        risk.safe.count++;
        risk.safe.quantity += qty;
      }
    }

    return risk;
  }

  private computeWasteByProduct(products: any[], batchesByProduct: Map<string, any[]>, now: Date): WasteByProduct[] {
    return products.map(product => {
      const pid = product._id.toString();
      const productBatches = batchesByProduct.get(pid) || [];
      const totalReceived = productBatches.reduce((sum, b) => sum + b.quantityReceived, 0);

      const totalWasted = productBatches
        .filter(b => b.expiryDate < now && b.quantityRemaining > 0)
        .reduce((sum, b) => sum + b.quantityRemaining, 0);

      const wasteRate = totalReceived > 0 ? (totalWasted / totalReceived) * 100 : 0;

      return {
        productId: pid,
        productName: product.name,
        sku: product.sku,
        totalReceived,
        totalWasted,
        wasteRate: Math.round(wasteRate * 10) / 10,
      };
    })
    .filter(w => w.totalReceived > 0)
    .sort((a, b) => b.wasteRate - a.wasteRate);
  }

  private computeSupplierPerformance(suppliers: any[], batchesBySupplier: Map<string, any[]>, now: Date): SupplierScore[] {
    return suppliers.map(supplier => {
      const sid = supplier._id.toString();
      const supplierBatches = batchesBySupplier.get(sid) || [];

      const shelfLifeDays = supplierBatches.map(b =>
        Math.ceil((b.expiryDate.getTime() - b.receivedAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      const avgShelfLifeDays = shelfLifeDays.length > 0
        ? Math.round(shelfLifeDays.reduce((sum, d) => sum + d, 0) / shelfLifeDays.length)
        : 0;

      const wastedQuantity = supplierBatches
        .filter(b => b.expiryDate < now && b.quantityRemaining > 0)
        .reduce((sum, b) => sum + b.quantityRemaining, 0);

      return {
        supplierId: sid,
        supplierName: supplier.name,
        totalBatches: supplierBatches.length,
        avgShelfLifeDays,
        wastedQuantity,
      };
    })
    .filter(s => s.totalBatches > 0)
    .sort((a, b) => a.avgShelfLifeDays - b.avgShelfLifeDays);
  }

  private computeMovementsByMonth(movements: any[]): MonthlyMovement[] {
    const monthlyMap = new Map<string, { totalIn: number; totalOut: number }>();

    for (const movement of movements) {
      const date = new Date(movement.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(month) || { totalIn: 0, totalOut: 0 };

      if (movement.type === 'IN') entry.totalIn += movement.quantity;
      if (movement.type === 'OUT') entry.totalOut += movement.quantity;

      monthlyMap.set(month, entry);
    }

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }

    return AnalyticsService.instance;
  }

}

export { AnalyticsData };
