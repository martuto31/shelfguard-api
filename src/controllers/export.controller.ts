import { RequestHandler } from 'express';

import ExportService from './../services/export.service';
import OrganizationDataLayer from './../data-layer/organization.data-layer';

export default class ExportController {

  private logContext = 'Export Controller';
  private exportService = ExportService.getInstance();
  private organizationDataLayer = OrganizationDataLayer.getInstance();

  public analyticsPdf: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> analyticsPdf()`;
    const today = new Date().toISOString().slice(0, 10);

    const organization = await this.organizationDataLayer.getById(req.user.organizationId, logContext);
    const doc = await this.exportService.generateAnalyticsPdf(req.user.organizationId, organization.name, logContext);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${today}.pdf"`);

    doc.pipe(res);
    doc.end();
  }

  public analyticsCsv: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> analyticsCsv()`;
    const today = new Date().toISOString().slice(0, 10);

    const csv = await this.exportService.generateAnalyticsCsv(req.user.organizationId, logContext);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stock-by-product-${today}.csv"`);
    res.status(200).send(csv);
  }

  public productsCsv: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> productsCsv()`;
    const today = new Date().toISOString().slice(0, 10);

    const csv = await this.exportService.generateProductsCsv(req.user.organizationId, logContext);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="products-${today}.csv"`);
    res.status(200).send(csv);
  }

  public batchesCsv: RequestHandler = async (req, res) => {
    const logContext = `${this.logContext} -> batchesCsv()`;
    const today = new Date().toISOString().slice(0, 10);

    const csv = await this.exportService.generateBatchesCsv(req.user.organizationId, logContext);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="batches-${today}.csv"`);
    res.status(200).send(csv);
  }

}
