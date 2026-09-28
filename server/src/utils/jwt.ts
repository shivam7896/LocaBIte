import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUserPayload } from '../types';

export const signAccessToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any
  });
};

export const signRefreshToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any
  });
};

export const verifyAccessToken = (token: string): AuthUserPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
};

export const verifyRefreshToken = (token: string): AuthUserPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthUserPayload;
};
