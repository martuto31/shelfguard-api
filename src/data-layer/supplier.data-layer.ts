import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { Supplier, SupplierDoc, ISupplier } from './../models/supplier.model';

export default class SupplierDataLayer {

  private logContext = 'Supplier Data Layer';

  public async create(data: Partial<ISupplier>, logContext: string): Promise<SupplierDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await Supplier.create(data)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async get(filter: FilterQuery<ISupplier>, logContext: string): Promise<SupplierDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> get()`;

    const supplier = await Supplier.findOne(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return supplier;
  }

  public async getMany(filter: FilterQuery<ISupplier>, logContext: string): Promise<SupplierDoc[]> {
    logContext = `${logContext} -> ${this.logContext} -> getMany()`;

    const suppliers = await Supplier.find(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return suppliers;
  }

  public async updateById(id: string | mongoose.Types.ObjectId, update: UpdateQuery<ISupplier>, logContext: string): Promise<SupplierDoc> {
    logContext = `${logContext} -> ${this.logContext} -> updateById()`;

    if (!mongoose.isValidObjectId(id)) {
      throw new CustomError(400, 'Invalid ID');
    }

    const supplier = await Supplier.findByIdAndUpdate(id, update, { new: true })
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()} | update: ${JSON.stringify(update)}`);
      });

    if (!supplier) {
      throw new CustomError(404, 'No supplier found');
    }

    return supplier;
  }

  private static instance: SupplierDataLayer;

  public static getInstance(): SupplierDataLayer {
    if (!SupplierDataLayer.instance) {
      SupplierDataLayer.instance = new SupplierDataLayer();
    }

    return SupplierDataLayer.instance;
  }

}
