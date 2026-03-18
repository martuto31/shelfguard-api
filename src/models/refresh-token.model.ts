import mongoose, { Schema, Types } from 'mongoose';

interface IRefreshToken {
    userId: Types.ObjectId;
    token: string;
    createdAt: Date;
    updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    token: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
    collection: 'refresh-tokens',
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const RefreshToken = db.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

type RefreshTokenDoc = ReturnType<(typeof RefreshToken)['hydrate']>;

export { RefreshToken, RefreshTokenDoc, IRefreshToken };
