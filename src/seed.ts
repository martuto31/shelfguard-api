import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import mongoose, { Types } from 'mongoose';
import bcryptjs from 'bcryptjs';

import { Organization } from './models/organization.model';
import { User, Role } from './models/user.model';
import { Supplier } from './models/supplier.model';
import { Product } from './models/product.model';
import { Batch } from './models/batch.model';
import { StockMovement, MovementType } from './models/stock-movement.model';

const DATABASE_URI = process.env.DATABASE_URI || '';

function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

function daysAgo(days: number): Date {
    return daysFromNow(-days);
}

async function hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(9);
    return bcryptjs.hash(password, salt);
}

async function seed() {
    console.log('Свързване с базата данни...');
    await mongoose.connect(DATABASE_URI);
    console.log('Свързано.');

    const db = mongoose.connection.useDb('shelfguard', { useCache: true });

    // ── Изчистване ──────────────────────────────────────────────
    console.log('Изчистване на стари демо данни...');
    await db.collection('stock-movements').deleteMany({});
    await db.collection('batches').deleteMany({});
    await db.collection('products').deleteMany({});
    await db.collection('suppliers').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('organizations').deleteMany({});
    await db.collection('refresh-tokens').deleteMany({});
    console.log('Изчистено.');

    // ── Организация ─────────────────────────────────────────────
    const org = await Organization.create({ name: 'Хранителен магазин "Родопи" ЕООД' });
    const orgId = org._id as Types.ObjectId;
    console.log('Организация:', org.name);

    // ── Потребители ──────────────────────────────────────────────
    const [ownerPw, managerPw, worker1Pw, worker2Pw] = await Promise.all([
        hashPassword('Admin123!'),
        hashPassword('Manager123!'),
        hashPassword('Worker123!'),
        hashPassword('Worker123!'),
    ]);

    const [owner, manager, worker1, worker2] = await User.insertMany([
        {
            name: 'Иван Петров',
            email: 'ivan.petrov@rodopi-shop.bg',
            password: ownerPw,
            role: Role.OWNER,
            organizationId: orgId,
            active: true,
        },
        {
            name: 'Мария Иванова',
            email: 'maria.ivanova@rodopi-shop.bg',
            password: managerPw,
            role: Role.MANAGER,
            organizationId: orgId,
            active: true,
        },
        {
            name: 'Георги Стоянов',
            email: 'georgi.stoyanov@rodopi-shop.bg',
            password: worker1Pw,
            role: Role.WORKER,
            organizationId: orgId,
            active: true,
        },
        {
            name: 'Елена Димитрова',
            email: 'elena.dimitrova@rodopi-shop.bg',
            password: worker2Pw,
            role: Role.WORKER,
            organizationId: orgId,
            active: true,
        },
    ]);
    console.log('Потребители: 4 (OWNER, MANAGER, 2×WORKER)');

    const workerId = (worker1 as any)._id as Types.ObjectId;
    const managerId = (manager as any)._id as Types.ObjectId;

    // ── Доставчици ───────────────────────────────────────────────
    const [zagorkaSup, mesokombSup, mlechnaSup, hlebozavodSup, distributorSup] = await Supplier.insertMany([
        {
            name: 'Загорка АД',
            contactPerson: 'Петър Колев',
            phone: '042 600 100',
            email: 'orders@zagorka.bg',
            organizationId: orgId,
        },
        {
            name: 'Месокомбинат Троян АД',
            contactPerson: 'Стоян Николов',
            phone: '0670 6 22 33',
            email: 'sales@meso-troyan.bg',
            organizationId: orgId,
        },
        {
            name: 'Млечни продукти "Родопея" ЕООД',
            contactPerson: 'Цветелина Маркова',
            phone: '0301 6 33 44',
            email: 'info@rodopea-dairy.bg',
            organizationId: orgId,
        },
        {
            name: 'Хлебозавод "Балкан" ООД',
            contactPerson: 'Николай Георгиев',
            phone: '062 97 11 22',
            email: 'office@balkan-bread.bg',
            organizationId: orgId,
        },
        {
            name: 'Унилевър България ЕООД',
            contactPerson: 'Анна Тодорова',
            phone: '02 960 70 00',
            email: 'orders.bg@unilever.com',
            organizationId: orgId,
        },
    ]);
    console.log('Доставчици: 5');

    const zagorkaId = (zagorkaSup as any)._id as Types.ObjectId;
    const mesokombId = (mesokombSup as any)._id as Types.ObjectId;
    const mlechnId = (mlechnaSup as any)._id as Types.ObjectId;
    const hlebId = (hlebozavodSup as any)._id as Types.ObjectId;
    const distId = (distributorSup as any)._id as Types.ObjectId;

    // ── Продукти ─────────────────────────────────────────────────
    const productsData = [
        // Млечни
        { name: 'Прясно мляко 3.6% – 1л', sku: 'MLK-001', category: 'Млечни продукти', unit: 'бр', minStockThreshold: 30, minShelfLifeDays: 3 },
        { name: 'Кисело мляко "Родопея" 400г', sku: 'MLK-002', category: 'Млечни продукти', unit: 'бр', minStockThreshold: 20, minShelfLifeDays: 5 },
        { name: 'Сирене бяло саламурено 400г', sku: 'SRN-001', category: 'Млечни продукти', unit: 'бр', minStockThreshold: 15, minShelfLifeDays: 7 },
        { name: 'Кашкавал "Пирин" 300г', sku: 'KSH-001', category: 'Млечни продукти', unit: 'бр', minStockThreshold: 10, minShelfLifeDays: 7 },
        // Месо и колбаси
        { name: 'Наденица пилешка 500г', sku: 'MES-001', category: 'Месо и колбаси', unit: 'бр', minStockThreshold: 20, minShelfLifeDays: 5 },
        { name: 'Кайма смесена 500г', sku: 'MES-002', category: 'Месо и колбаси', unit: 'бр', minStockThreshold: 15, minShelfLifeDays: 3 },
        { name: 'Салам "Ловджийски" 200г', sku: 'MES-003', category: 'Месо и колбаси', unit: 'бр', minStockThreshold: 12, minShelfLifeDays: 7 },
        // Хлебни изделия
        { name: 'Хляб "Добруджа" 700г', sku: 'HLB-001', category: 'Хлебни изделия', unit: 'бр', minStockThreshold: 40, minShelfLifeDays: 1 },
        { name: 'Козунак с мармалад 500г', sku: 'HLB-002', category: 'Хлебни изделия', unit: 'бр', minStockThreshold: 10, minShelfLifeDays: 3 },
        // Напитки
        { name: 'Бира "Загорка" 500мл', sku: 'NAP-001', category: 'Напитки', unit: 'бр', minStockThreshold: 48, minShelfLifeDays: 30 },
        { name: 'Минерална вода "Горна Баня" 1.5л', sku: 'NAP-002', category: 'Напитки', unit: 'бр', minStockThreshold: 24, minShelfLifeDays: 60 },
        // Сухи храни
        { name: 'Слънчогледово олио "Слънце" 1л', sku: 'SUH-001', category: 'Сухи храни', unit: 'бр', minStockThreshold: 20, minShelfLifeDays: 30 },
        { name: 'Захар бяла кристална 1кг', sku: 'SUH-002', category: 'Сухи храни', unit: 'бр', minStockThreshold: 20, minShelfLifeDays: 90 },
        // Домакинска химия
        { name: 'Прах за пране "Ариел" 1.3кг', sku: 'HIM-001', category: 'Домакинска химия', unit: 'бр', minStockThreshold: 10, minShelfLifeDays: 60 },
    ];

    const products = await Product.insertMany(
        productsData.map(p => ({ ...p, organizationId: orgId }))
    );
    console.log(`Продукти: ${products.length}`);

    const pid = (name: string) => {
        const p = products.find(x => x.name === name);
        if (!p) throw new Error(`Product not found: ${name}`);
        return (p as any)._id as Types.ObjectId;
    };

    // ── Партиди ──────────────────────────────────────────────────
    // Легенда: активни, близо до изтичане, изтекли, изчерпани
    const batchesData: any[] = [

        // ─── Прясно мляко ───
        { productId: pid('Прясно мляко 3.6% – 1л'), batchNumber: 'MLK-001-2604A', quantityReceived: 120, quantityRemaining: 84, expiryDate: daysFromNow(12), receivedAt: daysAgo(3), supplierId: mlechnId, notes: 'Редовна доставка' },
        { productId: pid('Прясно мляко 3.6% – 1л'), batchNumber: 'MLK-001-2604B', quantityReceived: 60, quantityRemaining: 60, expiryDate: daysFromNow(18), receivedAt: daysAgo(1), supplierId: mlechnId },
        // близо до изтичане (< minShelfLifeDays=3)
        { productId: pid('Прясно мляко 3.6% – 1л'), batchNumber: 'MLK-001-2603X', quantityReceived: 48, quantityRemaining: 6, expiryDate: daysFromNow(2), receivedAt: daysAgo(10), supplierId: mlechnId, notes: 'За продажба приоритетно' },

        // ─── Кисело мляко ───
        { productId: pid('Кисело мляко "Родопея" 400г'), batchNumber: 'MLK-002-2604A', quantityReceived: 80, quantityRemaining: 52, expiryDate: daysFromNow(9), receivedAt: daysAgo(6), supplierId: mlechnId },
        { productId: pid('Кисело мляко "Родопея" 400г'), batchNumber: 'MLK-002-2604B', quantityReceived: 60, quantityRemaining: 60, expiryDate: daysFromNow(15), receivedAt: daysAgo(1), supplierId: mlechnId },
        // изтекла партида
        { productId: pid('Кисело мляко "Родопея" 400г'), batchNumber: 'MLK-002-2603Z', quantityReceived: 40, quantityRemaining: 4, expiryDate: daysAgo(2), receivedAt: daysAgo(18), supplierId: mlechnId, notes: 'Изтекла – за бракуване' },

        // ─── Сирене ───
        { productId: pid('Сирене бяло саламурено 400г'), batchNumber: 'SRN-001-2604A', quantityReceived: 50, quantityRemaining: 38, expiryDate: daysFromNow(21), receivedAt: daysAgo(7), supplierId: mlechnId },
        { productId: pid('Сирене бяло саламурено 400г'), batchNumber: 'SRN-001-2604B', quantityReceived: 30, quantityRemaining: 30, expiryDate: daysFromNow(28), receivedAt: daysAgo(2), supplierId: mlechnId },

        // ─── Кашкавал ───
        { productId: pid('Кашкавал "Пирин" 300г'), batchNumber: 'KSH-001-2604A', quantityReceived: 40, quantityRemaining: 22, expiryDate: daysFromNow(30), receivedAt: daysAgo(14), supplierId: mlechnId },
        // близо до изтичане
        { productId: pid('Кашкавал "Пирин" 300г'), batchNumber: 'KSH-001-2603X', quantityReceived: 20, quantityRemaining: 5, expiryDate: daysFromNow(5), receivedAt: daysAgo(25), supplierId: mlechnId, notes: 'Последни бройки' },

        // ─── Наденица ───
        { productId: pid('Наденица пилешка 500г'), batchNumber: 'MES-001-2604A', quantityReceived: 60, quantityRemaining: 44, expiryDate: daysFromNow(8), receivedAt: daysAgo(5), supplierId: mesokombId },
        { productId: pid('Наденица пилешка 500г'), batchNumber: 'MES-001-2604B', quantityReceived: 48, quantityRemaining: 48, expiryDate: daysFromNow(14), receivedAt: daysAgo(1), supplierId: mesokombId },
        // изтекла
        { productId: pid('Наденица пилешка 500г'), batchNumber: 'MES-001-2603Z', quantityReceived: 30, quantityRemaining: 7, expiryDate: daysAgo(3), receivedAt: daysAgo(22), supplierId: mesokombId, notes: 'Изтекла – за бракуване' },

        // ─── Кайма ───
        { productId: pid('Кайма смесена 500г'), batchNumber: 'MES-002-2604A', quantityReceived: 45, quantityRemaining: 29, expiryDate: daysFromNow(4), receivedAt: daysAgo(4), supplierId: mesokombId },
        // изчерпана партида (история)
        { productId: pid('Кайма смесена 500г'), batchNumber: 'MES-002-2603A', quantityReceived: 40, quantityRemaining: 0, expiryDate: daysFromNow(60), receivedAt: daysAgo(30), supplierId: mesokombId, notes: 'Изчерпана' },

        // ─── Салам ───
        { productId: pid('Салам "Ловджийски" 200г'), batchNumber: 'MES-003-2604A', quantityReceived: 50, quantityRemaining: 37, expiryDate: daysFromNow(20), receivedAt: daysAgo(8), supplierId: mesokombId },

        // ─── Хляб ───
        { productId: pid('Хляб "Добруджа" 700г'), batchNumber: 'HLB-001-20260508', quantityReceived: 80, quantityRemaining: 53, expiryDate: daysFromNow(1), receivedAt: daysAgo(0), supplierId: hlebId, notes: 'Дневна доставка' },
        // вчерашен – изтекъл
        { productId: pid('Хляб "Добруджа" 700г'), batchNumber: 'HLB-001-20260507', quantityReceived: 60, quantityRemaining: 3, expiryDate: daysAgo(1), receivedAt: daysAgo(1), supplierId: hlebId, notes: 'Вчерашен хляб – за бракуване' },

        // ─── Козунак ───
        { productId: pid('Козунак с мармалад 500г'), batchNumber: 'HLB-002-2604A', quantityReceived: 30, quantityRemaining: 18, expiryDate: daysFromNow(7), receivedAt: daysAgo(8), supplierId: hlebId },

        // ─── Бира ───
        { productId: pid('Бира "Загорка" 500мл'), batchNumber: 'NAP-001-2601A', quantityReceived: 240, quantityRemaining: 168, expiryDate: daysFromNow(90), receivedAt: daysAgo(60), supplierId: zagorkaId },
        { productId: pid('Бира "Загорка" 500мл'), batchNumber: 'NAP-001-2604A', quantityReceived: 192, quantityRemaining: 192, expiryDate: daysFromNow(150), receivedAt: daysAgo(7), supplierId: zagorkaId },

        // ─── Вода ───
        { productId: pid('Минерална вода "Горна Баня" 1.5л'), batchNumber: 'NAP-002-2601A', quantityReceived: 120, quantityRemaining: 72, expiryDate: daysFromNow(240), receivedAt: daysAgo(60), supplierId: distId },
        { productId: pid('Минерална вода "Горна Баня" 1.5л'), batchNumber: 'NAP-002-2604A', quantityReceived: 96, quantityRemaining: 96, expiryDate: daysFromNow(360), receivedAt: daysAgo(5), supplierId: distId },

        // ─── Олио ───
        { productId: pid('Слънчогледово олио "Слънце" 1л'), batchNumber: 'SUH-001-2602A', quantityReceived: 72, quantityRemaining: 31, expiryDate: daysFromNow(120), receivedAt: daysAgo(45), supplierId: distId },
        { productId: pid('Слънчогледово олио "Слънце" 1л'), batchNumber: 'SUH-001-2604A', quantityReceived: 60, quantityRemaining: 60, expiryDate: daysFromNow(180), receivedAt: daysAgo(10), supplierId: distId },

        // ─── Захар ───
        { productId: pid('Захар бяла кристална 1кг'), batchNumber: 'SUH-002-2601A', quantityReceived: 100, quantityRemaining: 43, expiryDate: daysFromNow(365), receivedAt: daysAgo(90), supplierId: distId },
        { productId: pid('Захар бяла кристална 1кг'), batchNumber: 'SUH-002-2604A', quantityReceived: 80, quantityRemaining: 80, expiryDate: daysFromNow(500), receivedAt: daysAgo(14), supplierId: distId },

        // ─── Прах за пране ───
        { productId: pid('Прах за пране "Ариел" 1.3кг'), batchNumber: 'HIM-001-2602A', quantityReceived: 40, quantityRemaining: 17, expiryDate: daysFromNow(300), receivedAt: daysAgo(60), supplierId: distId },
        { productId: pid('Прах за пране "Ариел" 1.3кг'), batchNumber: 'HIM-001-2604A', quantityReceived: 30, quantityRemaining: 30, expiryDate: daysFromNow(450), receivedAt: daysAgo(10), supplierId: distId },
    ];

    const batches = await Batch.insertMany(
        batchesData.map(b => ({ ...b, organizationId: orgId }))
    );
    console.log(`Партиди: ${batches.length}`);

    // Помощна функция за намиране на партида
    const batchByNum = (num: string) => {
        const b = batches.find((x: any) => x.batchNumber === num);
        if (!b) throw new Error(`Batch not found: ${num}`);
        return b as any;
    };

    // ── Движения на склад ────────────────────────────────────────
    // Симулираме история: приемане (IN) + вземане (OUT) + бракуване (ADJUSTMENT)
    const movements: any[] = [];

    const addIn = (batch: any, qty: number, daysBack: number, performedBy: Types.ObjectId, reason = 'Приемане от доставчик') =>
        movements.push({ batchId: batch._id, productId: batch.productId, type: MovementType.IN, quantity: qty, reason, performedBy, organizationId: orgId, createdAt: daysAgo(daysBack), updatedAt: daysAgo(daysBack) });

    const addOut = (batch: any, qty: number, daysBack: number, performedBy: Types.ObjectId, reason = 'Продажба / изписване') =>
        movements.push({ batchId: batch._id, productId: batch.productId, type: MovementType.OUT, quantity: qty, reason, performedBy, organizationId: orgId, createdAt: daysAgo(daysBack), updatedAt: daysAgo(daysBack) });

    const addAdj = (batch: any, qty: number, daysBack: number, performedBy: Types.ObjectId, reason: string) =>
        movements.push({ batchId: batch._id, productId: batch.productId, type: MovementType.ADJUSTMENT, quantity: qty, reason, performedBy, organizationId: orgId, createdAt: daysAgo(daysBack), updatedAt: daysAgo(daysBack) });

    // Прясно мляко
    const mlkA = batchByNum('MLK-001-2604A');
    const mlkOld = batchByNum('MLK-001-2603X');
    addIn(mlkA, 120, 3, workerId);
    addOut(mlkA, 20, 2, workerId);
    addOut(mlkA, 16, 1, workerId);
    addIn(mlkOld, 48, 10, workerId);
    addOut(mlkOld, 42, 9, workerId);

    // Кисело мляко
    const klA = batchByNum('MLK-002-2604A');
    const klOld = batchByNum('MLK-002-2603Z');
    addIn(klA, 80, 6, workerId);
    addOut(klA, 18, 5, workerId);
    addOut(klA, 10, 3, workerId);
    addIn(klOld, 40, 18, workerId);
    addOut(klOld, 36, 17, workerId);
    addAdj(klOld, 4, 0, managerId, 'Бракуване – изтекъл срок на годност');

    // Наденица
    const nadA = batchByNum('MES-001-2604A');
    const nadOld = batchByNum('MES-001-2603Z');
    addIn(nadA, 60, 5, workerId);
    addOut(nadA, 11, 4, workerId);
    addOut(nadA, 5, 2, workerId);
    addIn(nadOld, 30, 22, workerId);
    addOut(nadOld, 23, 21, workerId);
    addAdj(nadOld, 7, 0, managerId, 'Бракуване – изтекъл срок на годност');

    // Хляб (дневни движения)
    const hlbToday = batchByNum('HLB-001-20260508');
    const hlbYest = batchByNum('HLB-001-20260507');
    addIn(hlbToday, 80, 0, workerId, 'Дневна доставка');
    addOut(hlbToday, 27, 0, workerId, 'Продажба');
    addIn(hlbYest, 60, 1, workerId, 'Дневна доставка');
    addOut(hlbYest, 57, 1, workerId, 'Продажба');
    addAdj(hlbYest, 3, 0, managerId, 'Бракуване – изтекъл хляб (вчерашен)');

    // Кайма – изчерпана партида
    const kaima = batchByNum('MES-002-2603A');
    addIn(kaima, 40, 30, workerId);
    addOut(kaima, 25, 25, workerId);
    addOut(kaima, 15, 20, workerId);

    // Бира
    const biraOld = batchByNum('NAP-001-2601A');
    addIn(biraOld, 240, 60, workerId);
    addOut(biraOld, 48, 45, workerId);
    addOut(biraOld, 24, 30, workerId);

    // Захар
    const zaharOld = batchByNum('SUH-002-2601A');
    addIn(zaharOld, 100, 90, workerId);
    addOut(zaharOld, 35, 70, workerId);
    addOut(zaharOld, 22, 40, workerId);

    // Олио
    const olioOld = batchByNum('SUH-001-2602A');
    addIn(olioOld, 72, 45, workerId);
    addOut(olioOld, 25, 35, workerId);
    addOut(olioOld, 16, 20, workerId);

    // Прах за пране
    const prahOld = batchByNum('HIM-001-2602A');
    addIn(prahOld, 40, 60, workerId);
    addOut(prahOld, 13, 40, workerId);
    addOut(prahOld, 10, 20, workerId);

    await StockMovement.insertMany(movements);
    console.log(`Движения на склад: ${movements.length}`);

    // ── Обобщение ─────────────────────────────────────────────────
    console.log('\n── Демо данни заредени успешно ──');
    console.log('Организация : Хранителен магазин "Родопи" ЕООД');
    console.log('Акаунти     :');
    console.log('  OWNER   – ivan.petrov@rodopi-shop.bg    / Admin123!');
    console.log('  MANAGER – maria.ivanova@rodopi-shop.bg  / Manager123!');
    console.log('  WORKER  – georgi.stoyanov@rodopi-shop.bg / Worker123!');
    console.log('  WORKER  – elena.dimitrova@rodopi-shop.bg / Worker123!');
    console.log(`Доставчици  : 5`);
    console.log(`Продукти    : ${products.length}  (6 категории)`);
    console.log(`Партиди     : ${batches.length}  (активни, близо до изтичане, изтекли, изчерпани)`);
    console.log(`Движения    : ${movements.length}`);

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Грешка при сийдване:', err);
    process.exit(1);
});
