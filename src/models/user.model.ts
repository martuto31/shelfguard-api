import mongoose, { Schema, Types } from 'mongoose';
import bcryptjs from 'bcryptjs';

enum Role {
    OWNER = 'OWNER',
    MANAGER = 'MANAGER',
    WORKER = 'WORKER',
}

interface IUser {
    name: string;
    email: string;
    password: string;
    role: Role;
    organizationId: Types.ObjectId;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: Object.values(Role),
        default: Role.WORKER,
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Organization',
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
    },
},
{
    timestamps: true,
    collection: 'users',
});

UserSchema.pre<UserDoc>('save', async function(): Promise<void> {
    const user = this;

    if (user.isModified('password')) {
        const hashSalt = await bcryptjs.genSalt(9);

        user.password = await bcryptjs.hash(user.password, hashSalt);
    }
});

UserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) {
        delete ret._id;
        delete ret.password;
    },
});

const db = mongoose.connection.useDb('shelfguard', { useCache: true });
const User = db.model<IUser>('User', UserSchema);

type UserDoc = ReturnType<(typeof User)['hydrate']>;

export { User, UserDoc, IUser, Role };
