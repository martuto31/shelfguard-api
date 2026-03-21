import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { Product, ProductDoc, IProduct } from './../models/product.model';

export default class ProductDataLayer {

  private logContext = 'Product Data Layer';

  public async create(data: Partial<IProduct>, logContext: string): Promise<ProductDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await Product.create(data)
      .catch(err => {
        if (err.code === 11000) {
          throw new CustomError(400, 'SKU already exist');
        }

        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async get(filter: FilterQuery<IProduct>, logContext: string): Promise<ProductDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> get()`;

    const product = await Product.findOne(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return product;
  }

  public async getMany(filter: FilterQuery<IProduct>, logContext: string): Promise<ProductDoc[]> {
    logContext = `${logContext} -> ${this.logContext} -> getMany()`;

    const products = await Product.find(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return products;
  }

  public async updateById(id: string | mongoose.Types.ObjectId, update: UpdateQuery<IProduct>, logContext: string): Promise<ProductDoc> {
    logContext = `${logContext} -> ${this.logContext} -> updateById()`;

    if (!mongoose.isValidObjectId(id)) {
      throw new CustomError(400, 'Invalid ID');
    }

    const product = await Product.findByIdAndUpdate(id, update, { new: true })
      .catch(err => {
        if (err.code === 11000) {
          throw new CustomError(400, 'SKU already exist');
        }

        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()} | update: ${JSON.stringify(update)}`);
      });

    if (!product) {
      throw new CustomError(404, 'No product found');
    }

    return product;
  }

  public async delete(id: string | mongoose.Types.ObjectId, logContext: string): Promise<void> {
    logContext = `${logContext} -> ${this.logContext} -> delete()`;

    if (!mongoose.isValidObjectId(id)) {
      throw new CustomError(400, 'Invalid ID');
    }

    await Product.deleteOne({ _id: id })
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()}`);
      });
  }

  private static instance: ProductDataLayer;

  public static getInstance(): ProductDataLayer {
    if (!ProductDataLayer.instance) {
      ProductDataLayer.instance = new ProductDataLayer();
    }

    return ProductDataLayer.instance;
  }

}
