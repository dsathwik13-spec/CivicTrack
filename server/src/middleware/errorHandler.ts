import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler — never leaks stack traces or internal details
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred',
  });
}
