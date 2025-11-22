import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'admin_panel',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const connection = await getDbPool().getConnection();
  try {
    const [results] = await connection.execute(sql, params || []);
    return results as any[];
  } finally {
    connection.release();
  }
}

export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<void> {
  await query(sql, params);
}

export async function beginTransaction(): Promise<mysql.PoolConnection> {
  const connection = await getDbPool().getConnection();
  await connection.beginTransaction();
  return connection;
}

export async function commit(connection: mysql.PoolConnection): Promise<void> {
  await connection.commit();
  connection.release();
}

export async function rollback(connection: mysql.PoolConnection): Promise<void> {
  await connection.rollback();
  connection.release();
}

// Generate ID utility
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

