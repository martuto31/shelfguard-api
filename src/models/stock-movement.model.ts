import mongoose, { Schema, Types } from 'mongoose';

enum MovementType {
    IN = 'IN',
    OUT = 'OUT',
    ADJUSTMENT = 'ADJUSTMENT',
}

interface IStockMovement {
    batchId: Types.ObjectId;
    productId: Types.ObjectId;
    type: MovementType;
    quantity: number;
    reason: string;
    performedBy: Types.ObjectId;
    organizationId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>({
    batchId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Batch',
    },
    productId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Product',
    },
    type: {
        type: String,
        required: true,
        enum: Object.values(MovementType),
    },
    quantity: {
        type: Number,
        required: true,
    },
    reason: {
        type: String,
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Organization',
    },
},
{
    timestamps: true,
    collection: 'stock-movements',
});

StockMovementSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const StockMovement = db.model<IStockMovement>('StockMovement', StockMovementSchema);

type StockMovementDoc = ReturnType<(typeof StockMovement)['hydrate']>;

export { StockMovement, StockMovementDoc, IStockMovement, MovementType };
