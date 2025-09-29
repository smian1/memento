import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { TOKEN_COOKIE_NAME } from '../config.js';

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length);
  }

  const cookieToken = (req as any).cookies?.[TOKEN_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}
