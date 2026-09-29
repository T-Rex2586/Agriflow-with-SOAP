import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, config.jwt.accessSecret as Secret, options);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, config.jwt.refreshSecret as Secret, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
};
