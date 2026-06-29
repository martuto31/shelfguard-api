import path from 'path'
import * as dotenv from 'dotenv'

((): void => {
    const envFile = '.env';

    dotenv.config({ path: path.resolve(__dirname, '..', envFile) });
})();

export default class Config {

    public server = {
        port: Number(process.env.PORT) || 3000,
        hostname: '127.0.0.1',
    };

    public databaseUri = process.env.DATABASE_URI || '';

    public jwt = {
        accessExpireTime: '60m',
        refreshExpireTime: '12h',
        accessSecret: process.env.JWT_ACCESS || '',
        refreshSecret: process.env.JWT_REFRESH || '',
    };

    private static instance: Config;

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }

        return Config.instance;
    }

}
