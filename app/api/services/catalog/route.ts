import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query } from '@/lib/db';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const services = await query(
      `SELECT id, name, sort_order FROM services WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
    );

    const items = await query(
      `SELECT id, service_id, label, sort_order
       FROM service_matrix_items
       WHERE is_active = 1
       ORDER BY sort_order ASC, label ASC`
    );

    const byService = new Map<string, { id: string; label: string; sort_order: number }[]>();
    for (const row of items as any[]) {
      const list = byService.get(row.service_id) ?? [];
      list.push({
        id: row.id,
        label: row.label,
        sort_order: Number(row.sort_order) || 0,
      });
      byService.set(row.service_id, list);
    }

    const data = (services as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      sort_order: Number(s.sort_order) || 0,
      matrix_items: byService.get(s.id) ?? [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Catalog error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load catalog' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
