import type { Request } from 'express';

export interface AuthTokenPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}
