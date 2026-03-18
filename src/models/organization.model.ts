import mongoose, { Schema } from 'mongoose';

interface IOrganization {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
    name: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
    collection: 'organizations',
});

OrganizationSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const Organization = db.model<IOrganization>('Organization', OrganizationSchema);

type OrganizationDoc = ReturnType<(typeof Organization)['hydrate']>;

export { Organization, OrganizationDoc, IOrganization };
