import mongoose, { Schema, Types } from 'mongoose';

interface IProduct {
    name: string;
    sku: string;
    category: string;
    unit: string;
    minStockThreshold: number;
    minShelfLifeDays: number;
    organizationId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
    name: {
        type: String,
        required: true,
    },
    sku: {
        type: String,
        required: true,
    },
    category: {
        type: String,
    },
    unit: {
        type: String,
        required: true,
        default: 'pcs',
    },
    minStockThreshold: {
        type: Number,
        required: true,
        default: 0,
    },
    minShelfLifeDays: {
        type: Number,
        required: true,
        default: 0,
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Organization',
    },
},
{
    timestamps: true,
    collection: 'products',
});

ProductSchema.index({ sku: 1, organizationId: 1 }, { unique: true });

ProductSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const Product = db.model<IProduct>('Product', ProductSchema);

type ProductDoc = ReturnType<(typeof Product)['hydrate']>;

export { Product, ProductDoc, IProduct };
