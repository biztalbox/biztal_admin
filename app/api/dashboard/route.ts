import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, query } from '@/lib/db';

async function handleGet(req: NextRequest, userId: string) {
  try {
    // Get statistics
    const totalClients = await queryOne('SELECT COUNT(*) as count FROM clients', []);
    const totalEmployees = await queryOne('SELECT COUNT(*) as count FROM employees', []);
    const totalRevenue = await queryOne(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = "PAID"',
      []
    );
    const pendingInvoices = await queryOne(
      'SELECT COUNT(*) as count FROM invoices WHERE status != "PAID" AND status != "DRAFT"',
      []
    );

    // Get recent clients
    const recentClients = await query(
      'SELECT * FROM clients ORDER BY created_at DESC LIMIT 5',
      []
    );

    // Get recent payments
    const recentPayments = await query(
      `SELECT p.*, c.name as client_name, i.invoice_number 
       FROM payments p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       ORDER BY p.paid_at DESC LIMIT 5`,
      []
    );

    return NextResponse.json({
      success: true,
      data: {
        totalClients: totalClients?.count || 0,
        totalEmployees: totalEmployees?.count || 0,
        totalRevenue: parseFloat(totalRevenue?.total || '0'),
        pendingInvoices: pendingInvoices?.count || 0,
        recentClients: recentClients || [],
        recentPayments: recentPayments || [],
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);

