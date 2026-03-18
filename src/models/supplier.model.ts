import mongoose, { Schema, Types } from 'mongoose';

interface ISupplier {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    organizationId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
    name: {
        type: String,
        required: true,
    },
    contactPerson: {
        type: String,
    },
    phone: {
        type: String,
    },
    email: {
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
    collection: 'suppliers',
});

SupplierSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const Supplier = db.model<ISupplier>('Supplier', SupplierSchema);

type SupplierDoc = ReturnType<(typeof Supplier)['hydrate']>;

export { Supplier, SupplierDoc, ISupplier };
