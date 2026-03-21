import { RequestHandler } from 'express';

import CustomError from './../utils/custom-error.util';

import SupplierDataLayer from './../data-layer/supplier.data-layer';

export default class SupplierController {

  private logContext = 'Supplier Controller';

  private supplierDataLayer = SupplierDataLayer.getInstance();

  public getAll: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> getAll()`;

    const suppliers = await this.supplierDataLayer.getMany({ organizationId: req.user.organizationId }, logContext);

    res.status(200).json(suppliers);
  }

  public create: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> create()`;

    const { name, contactPerson, phone, email } = req.body;

    if (!name) {
      throw new CustomError(400, 'Missing fields: name');
    }

    const supplier = await this.supplierDataLayer.create({
      name,
      contactPerson,
      phone,
      email,
      organizationId: req.user.organizationId,
    }, logContext);

    res.status(201).json(supplier);
  }

  public update: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> update()`;

    const id = req.params.id as string;
    const { name, contactPerson, phone, email } = req.body;

    const supplier = await this.supplierDataLayer.updateById(id, { name, contactPerson, phone, email }, logContext);

    res.status(200).json(supplier);
  }

}
