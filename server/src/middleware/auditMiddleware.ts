import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

export const logAdminAction = (actionName: string, resourceName: string) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    // Only log if authenticated
    if (req.user) {
      try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await AuditLog.create({
          adminId: req.user.userId,
          adminEmail: req.user.email,
          action: actionName,
          resource: resourceName,
          resourceId:
            req.params.id ||
            req.params.userId ||
            req.params.orderId ||
            req.body?.id ||
            req.body?.userId ||
            req.body?.orderId,
          details: {
            method: req.method,
            path: req.originalUrl,
            params: req.params,
            query: req.query,
            body: req.body
          },
          ipAddress: Array.isArray(ip) ? ip[0] : (ip as string),
          userAgent: req.headers['user-agent']
        });
      } catch (err: any) {
        logger.error('Failed to write audit log:', err.message);
      }
    }
    next();
  };
};
