import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { Batch, BatchDoc, IBatch } from './../models/batch.model';

export default class BatchDataLayer {

  private logContext = 'Batch Data Layer';

  public async create(data: Partial<IBatch>, logContext: string): Promise<BatchDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await Batch.create(data)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async get(filter: FilterQuery<IBatch>, logContext: string): Promise<BatchDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> get()`;

    const batch = await Batch.findOne(filter)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return batch;
  }

  public async getMany(filter: FilterQuery<IBatch>, logContext: string, populate?: string[], sort?: Record<string, 1 | -1>): Promise<BatchDoc[]> {
    logContext = `${logContext} -> ${this.logContext} -> getMany()`;

    let query = Batch.find(filter);

    if (populate) {
      for (const field of populate) {
        query = query.populate(field);
      }
    }

    if (sort) {
      query = query.sort(sort);
    }

    const batches = await query
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return batches;
  }

  public async updateById(id: string | mongoose.Types.ObjectId, update: UpdateQuery<IBatch>, logContext: string): Promise<BatchDoc> {
    logContext = `${logContext} -> ${this.logContext} -> updateById()`;

    if (!mongoose.isValidObjectId(id)) {
      throw new CustomError(400, 'Invalid ID');
    }

    const batch = await Batch.findByIdAndUpdate(id, update, { new: true })
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> id: ${id.toString()} | update: ${JSON.stringify(update)}`);
      });

    if (!batch) {
      throw new CustomError(404, 'No batch found');
    }

    return batch;
  }

  public async updateByFilter(filter: FilterQuery<IBatch>, update: UpdateQuery<IBatch>, logContext: string): Promise<BatchDoc | null> {
    logContext = `${logContext} -> ${this.logContext} -> updateByFilter()`;

    const batch = await Batch.findOneAndUpdate(filter, update, { new: true })
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)} | update: ${JSON.stringify(update)}`);
      });

    return batch;
  }

  private static instance: BatchDataLayer;

  public static getInstance(): BatchDataLayer {
    if (!BatchDataLayer.instance) {
      BatchDataLayer.instance = new BatchDataLayer();
    }

    return BatchDataLayer.instance;
  }

}
