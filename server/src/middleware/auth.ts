import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: UserRole;
    }
  }
}

/**
 * Require the user to be authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  next();
}

/**
 * Require specific roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!req.session.userRole || !roles.includes(req.session.userRole)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    req.userId = req.session.userId;
    req.userRole = req.session.userRole;
    next();
  };
}

/**
 * Allow authenticated users or pass through (for optional auth)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId) {
    req.userId = req.session.userId;
    req.userRole = req.session.userRole;
  }
  next();
}
