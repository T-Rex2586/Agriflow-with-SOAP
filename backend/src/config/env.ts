import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'agriflow_jwt_access_secret_super_secure_key_123';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'agriflow_jwt_refresh_secret_super_secure_key_456';

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || '',
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  jwt: {
    secret: accessSecret,
    accessSecret: accessSecret,
    refreshSecret: refreshSecret,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '8h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    expiry: process.env.JWT_EXPIRY || '8h',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
  },
};
