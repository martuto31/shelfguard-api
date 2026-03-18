import mongoose, { Schema, Types } from 'mongoose';

interface IBatch {
    productId: Types.ObjectId;
    batchNumber: string;
    quantityReceived: number;
    quantityRemaining: number;
    expiryDate: Date;
    receivedAt: Date;
    supplierId: Types.ObjectId;
    notes: string;
    organizationId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>({
    productId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Product',
    },
    batchNumber: {
        type: String,
        required: true,
    },
    quantityReceived: {
        type: Number,
        required: true,
    },
    quantityRemaining: {
        type: Number,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    receivedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
    },
    notes: {
        type: String,
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Organization',
    },
},
{
    timestamps: true,
    collection: 'batches',
});

BatchSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const Batch = db.model<IBatch>('Batch', BatchSchema);

type BatchDoc = ReturnType<(typeof Batch)['hydrate']>;

export { Batch, BatchDoc, IBatch };
