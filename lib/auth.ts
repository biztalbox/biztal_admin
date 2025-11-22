import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-min-32-chars-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  phone?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await queryOne(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    return null;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = await queryOne('SELECT id, name, email, role, image, phone FROM users WHERE id = ?', [userId]);
  return user as User | null;
}

