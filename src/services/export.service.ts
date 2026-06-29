import path from 'path';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

import AnalyticsService from './analytics.service';
import ProductDataLayer from './../data-layer/product.data-layer';
import BatchDataLayer from './../data-layer/batch.data-layer';
import OrganizationDataLayer from './../data-layer/organization.data-layer';

export default class ExportService {

  private logContext = 'Export Service';
  private analyticsService = AnalyticsService.getInstance();
  private productDataLayer = ProductDataLayer.getInstance();
  private batchDataLayer = BatchDataLayer.getInstance();
  private organizationDataLayer = OrganizationDataLayer.getInstance();

  private fontRegular = path.join(__dirname, '../assets/fonts/Inter-Regular.ttf');
  private fontBold = path.join(__dirname, '../assets/fonts/Inter-Bold.ttf');

  // PDF Generation

  public async generateAnalyticsPdf(organizationId: mongoose.Types.ObjectId, orgName: string, logContext: string): Promise<typeof PDFDocument.prototype> {
    logContext = `${logContext} -> ${this.logContext} -> generateAnalyticsPdf()`;

    const data = await this.analyticsService.getAnalytics(organizationId, logContext);
    const today = this.formatDate(new Date());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.registerFont('Inter', this.fontRegular);
    doc.registerFont('Inter-Bold', this.fontBold);

    // Header
    doc.font('Inter-Bold').fontSize(20).text('Аналитичен отчет', { align: 'center' });
    doc.font('Inter').fontSize(11).text(`${orgName} | ${today}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary KPIs
    this.drawSectionTitle(doc, 'Обобщение');

    const s = data.summary;
    const kpis = [
      ['Продукти', `${s.totalProducts}`],
      ['Обща наличност', `${s.totalStock}`],
      ['Изтекли партиди', `${s.expiredBatches}`],
      ['Изтекло количество', `${s.expiredQuantity}`],
      ['Нисък запас', `${s.lowStockProducts}`],
      ['Изведено (месец)', `${s.picksThisMonth}`],
      ['Загуби', `${s.wasteRate}%`],
    ];

    const kpiColWidth = 250;
    const startX = doc.x;
    let kpiY = doc.y;

    for (let i = 0; i < kpis.length; i++) {
      const col = i % 2;
      const x = startX + col * kpiColWidth;

      if (col === 0 && i > 0) kpiY += 18;

      doc.font('Inter').fontSize(10).text(`${kpis[i][0]}: `, x, kpiY, { continued: true });
      doc.font('Inter-Bold').text(kpis[i][1]);
    }

    doc.y = kpiY + 30;

    // Stock by Product
    if (data.stockByProduct.length > 0) {
      this.drawSectionTitle(doc, 'Наличност по продукти');

      const stockHeaders = ['Продукт', 'SKU', 'Категория', 'Наличност', 'Мін. праг', 'Статус', 'Партиди', 'Най-ранен срок'];
      const stockWidths = [90, 55, 60, 55, 50, 45, 40, 80];
      const stockRows = data.stockByProduct.map(item => [
        item.productName,
        item.sku,
        item.category,
        `${item.totalRemaining}`,
        `${item.minStockThreshold}`,
        item.isLowStock ? 'Нисък' : (item.totalRemaining === 0 ? 'Няма' : 'Добър'),
        `${item.activeBatches}`,
        item.earliestExpiry ? this.formatDate(new Date(item.earliestExpiry)) : '—',
      ]);

      this.drawTable(doc, stockHeaders, stockRows, stockWidths);
    }

    // Expiry Risk
    const risk = data.expiryRisk;
    const riskEntries = [
      ['Изтекли', risk.expired],
      ['Критични (≤7 дни)', risk.critical],
      ['Внимание (≤30 дни)', risk.warning],
      ['Наблюдение (≤90 дни)', risk.monitor],
      ['Безопасни (90+ дни)', risk.safe],
    ].filter(([, v]: any) => v.count > 0);

    if (riskEntries.length > 0) {
      this.drawSectionTitle(doc, 'Риск от изтичане');

      const riskHeaders = ['Категория', 'Партиди', 'Количество'];
      const riskWidths = [200, 100, 100];
      const riskRows = riskEntries.map(([label, v]: any) => [label, `${v.count}`, `${v.quantity}`]);

      this.drawTable(doc, riskHeaders, riskRows, riskWidths);
    }

    // Waste by Product
    if (data.wasteByProduct.length > 0) {
      this.drawSectionTitle(doc, 'Загуби по продукти');

      const wasteHeaders = ['Продукт', 'SKU', 'Получено', 'Загубено', 'Загуби %'];
      const wasteWidths = [140, 80, 80, 80, 80];
      const wasteRows = data.wasteByProduct.map(item => [
        item.productName,
        item.sku,
        `${item.totalReceived}`,
        `${item.totalWasted}`,
        `${item.wasteRate}%`,
      ]);

      this.drawTable(doc, wasteHeaders, wasteRows, wasteWidths);
    }

    // Supplier Performance
    if (data.supplierPerformance.length > 0) {
      this.drawSectionTitle(doc, 'Оценка на доставчици');

      const suppHeaders = ['Доставчик', 'Партиди', 'Ср. срок при доставка (дни)', 'Загубено кол.'];
      const suppWidths = [150, 80, 150, 80];
      const suppRows = data.supplierPerformance.map(item => [
        item.supplierName,
        `${item.totalBatches}`,
        `${item.avgShelfLifeDays}`,
        `${item.wastedQuantity}`,
      ]);

      this.drawTable(doc, suppHeaders, suppRows, suppWidths);
    }

    // Monthly Movements
    if (data.movementsByMonth.length > 0) {
      this.drawSectionTitle(doc, 'Движения по месеци');

      const movHeaders = ['Месец', 'Получено (IN)', 'Изведено (OUT)', 'Нетно'];
      const movWidths = [120, 100, 100, 100];
      const movRows = data.movementsByMonth.map(item => [
        item.month,
        `${item.totalIn}`,
        `${item.totalOut}`,
        `${item.totalIn - item.totalOut}`,
      ]);

      this.drawTable(doc, movHeaders, movRows, movWidths);
    }

    return doc;
  }

  private drawSectionTitle(doc: typeof PDFDocument.prototype, title: string): void {
    if (doc.y > 750) doc.addPage();

    doc.font('Inter-Bold').fontSize(13).text(title);
    doc.moveDown(0.3);
  }

  private drawTable(doc: typeof PDFDocument.prototype, headers: string[], rows: string[][], columnWidths: number[]): void {
    const startX = doc.x;
    const rowHeight = 18;
    const fontSize = 8;
    const pageBottom = 780;

    // Header row
    if (doc.y > pageBottom - rowHeight * 2) doc.addPage();

    let x = startX;

    doc.font('Inter-Bold').fontSize(fontSize);

    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, doc.y, { width: columnWidths[i], lineBreak: false });
      x += columnWidths[i];
    }

    doc.y += rowHeight;
    doc.moveTo(startX, doc.y - 4).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), doc.y - 4).lineWidth(0.5).stroke('#cccccc');

    // Data rows
    doc.font('Inter').fontSize(fontSize);

    for (const row of rows) {
      if (doc.y > pageBottom) doc.addPage();

      x = startX;
      const currentY = doc.y;

      for (let i = 0; i < row.length; i++) {
        doc.text(String(row[i] ?? ''), x, currentY, { width: columnWidths[i], lineBreak: false });
        x += columnWidths[i];
      }

      doc.y = currentY + rowHeight;
    }

    doc.moveDown(1);
  }

  // CSV Generation

  public async generateAnalyticsCsv(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<string> {
    logContext = `${logContext} -> ${this.logContext} -> generateAnalyticsCsv()`;

    const data = await this.analyticsService.getAnalytics(organizationId, logContext);

    const headers = ['Продукт', 'SKU', 'Категория', 'Мерна ед.', 'Наличност', 'Мін. праг', 'Статус', 'Активни партиди', 'Най-ранен срок'];

    const rows = data.stockByProduct.map(item => [
      item.productName,
      item.sku,
      item.category,
      item.unit,
      `${item.totalRemaining}`,
      `${item.minStockThreshold}`,
      item.isLowStock ? 'Нисък' : (item.totalRemaining === 0 ? 'Няма' : 'Добър'),
      `${item.activeBatches}`,
      item.earliestExpiry ? this.formatDate(new Date(item.earliestExpiry)) : '',
    ]);

    return this.toCsv(headers, rows);
  }

  public async generateProductsCsv(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<string> {
    logContext = `${logContext} -> ${this.logContext} -> generateProductsCsv()`;

    const products = await this.productDataLayer.getMany({ organizationId }, logContext);

    const headers = ['Име', 'SKU', 'Категория', 'Мерна ед.', 'Мін. наличност', 'Мін. срок (дни)'];

    const rows = products.map(p => [
      p.name,
      p.sku,
      p.category || '',
      p.unit,
      `${p.minStockThreshold}`,
      `${p.minShelfLifeDays || 0}`,
    ]);

    return this.toCsv(headers, rows);
  }

  public async generateBatchesCsv(organizationId: mongoose.Types.ObjectId, logContext: string): Promise<string> {
    logContext = `${logContext} -> ${this.logContext} -> generateBatchesCsv()`;

    const batches = await this.batchDataLayer.getMany(
      { organizationId },
      logContext,
      ['productId', 'supplierId'],
      { expiryDate: 1 },
    );

    const headers = ['Продукт', 'SKU', 'Партида', 'Получено кол.', 'Остатък', 'Срок на годност', 'Получено на', 'Доставчик', 'Бележки'];

    const rows = batches.map(b => {
      const product = b.productId as any;
      const supplier = b.supplierId as any;

      return [
        product?.name || '',
        product?.sku || '',
        b.batchNumber,
        `${b.quantityReceived}`,
        `${b.quantityRemaining}`,
        this.formatDate(b.expiryDate),
        this.formatDate(b.receivedAt),
        supplier?.name || '',
        b.notes || '',
      ];
    });

    return this.toCsv(headers, rows);
  }

  // Helpers

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private toCsv(headers: string[], rows: string[][]): string {
    const headerLine = headers.map(h => this.escapeCsvValue(h)).join(',');
    const dataLines = rows.map(row => row.map(v => this.escapeCsvValue(v)).join(','));

    return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private static instance: ExportService;

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }

    return ExportService.instance;
  }

}
