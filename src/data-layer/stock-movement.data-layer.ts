import mongoose, { FilterQuery } from 'mongoose';

import CustomError from './../utils/custom-error.util';

import { StockMovement, StockMovementDoc, IStockMovement } from './../models/stock-movement.model';

export default class StockMovementDataLayer {

  private logContext = 'StockMovement Data Layer';

  public async create(data: Partial<IStockMovement>, logContext: string): Promise<StockMovementDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await StockMovement.create(data)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  public async getMany(filter: FilterQuery<IStockMovement>, logContext: string, populate?: string[], sort?: Record<string, 1 | -1>): Promise<StockMovementDoc[]> {
    logContext = `${logContext} -> ${this.logContext} -> getMany()`;

    let query = StockMovement.find(filter);

    if (populate) {
      for (const field of populate) {
        query = query.populate(field);
      }
    }

    if (sort) {
      query = query.sort(sort);
    }

    const stockMovements = await query
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> filter: ${JSON.stringify(filter)}`);
      });

    return stockMovements;
  }

  private static instance: StockMovementDataLayer;

  public static getInstance(): StockMovementDataLayer {
    if (!StockMovementDataLayer.instance) {
      StockMovementDataLayer.instance = new StockMovementDataLayer();
    }

    return StockMovementDataLayer.instance;
  }

}
