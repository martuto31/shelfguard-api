import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import ProductDataLayer from './../data-layer/product.data-layer';
import BatchDataLayer from './../data-layer/batch.data-layer';

export default class ProductController {

  private logContext = 'Product Controller';
  private productDataLayer = ProductDataLayer.getInstance();
  private batchDataLayer = BatchDataLayer.getInstance();

  public getAll: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getAll()`;

    const products = await this.productDataLayer.getMany({ organizationId: req.user.organizationId }, logContext);

    res.status(200).json(products);
  }

  public create: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> create()`;
    const { name, sku, category, unit, minStockThreshold, minShelfLifeDays } = req.body;

    if (!name || !sku) {
      throw new CustomError(400, 'Missing fields: name | sku');
    }

    const existing = await this.productDataLayer.get({ sku, organizationId: req.user.organizationId }, logContext);

    if (existing) {
      throw new CustomError(409, 'SKU already exist');
    }

    const product = await this.productDataLayer.create({
      name,
      sku,
      category,
      unit,
      minStockThreshold,
      minShelfLifeDays,
      organizationId: req.user.organizationId,
    }, logContext);

    res.status(201).json(product);
  }

  public update: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> update()`;
    const id = req.params.id as string;
    const { name, sku, category, unit, minStockThreshold, minShelfLifeDays } = req.body;

    const product = await this.productDataLayer.updateById(id, { name, sku, category, unit, minStockThreshold, minShelfLifeDays }, logContext);

    res.status(200).json(product);
  }

  public delete: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> delete()`;
    const id = req.params.id as string;

    const batch = await this.batchDataLayer.get({ productId: id, organizationId: req.user.organizationId, quantityRemaining: { $gt: 0 } }, logContext);

    if (batch) {
      throw new CustomError(409, 'Product has batches with remaining stock');
    }

    await this.productDataLayer.delete(id, logContext);

    res.status(200).json();
  }

  public getBatches: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getBatches()`;
    const id = req.params.id as string;

    const batches = await this.batchDataLayer.getMany(
      { productId: id, organizationId: req.user.organizationId },
      logContext,
      ['supplierId'],
      { expiryDate: 1 },
    );

    res.status(200).json(batches);
  }

}
