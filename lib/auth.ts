import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface TokenPayload {
  userId: number;
  username: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const getUserFromRequest = (req: NextApiRequest): TokenPayload | null => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
};
