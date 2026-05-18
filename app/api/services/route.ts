import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { execute, query } from '@/lib/db';
import { generateId } from '@/lib/utils';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const services = await query(
      `SELECT id, name, sort_order, is_active, created_at, updated_at
       FROM services
       ORDER BY sort_order ASC, name ASC`
    );

    const serviceIds = (services as any[]).map((s) => s.id);
    let itemsByService = new Map<string, any[]>();
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(', ');
      const items = await query(
        `SELECT id, service_id, label, sort_order, is_active, created_at, updated_at
         FROM service_matrix_items
         WHERE service_id IN (${placeholders})
         ORDER BY sort_order ASC, label ASC`,
        serviceIds
      );
      for (const row of items as any[]) {
        const list = itemsByService.get(row.service_id) ?? [];
        list.push(row);
        itemsByService.set(row.service_id, list);
      }
    }

    const data = (services as any[]).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
      matrix_items: (itemsByService.get(s.id) ?? []).map((m: any) => ({
        ...m,
        is_active: Boolean(m.is_active),
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Services list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, userId: string) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 }
      );
    }

    const sort_order =
      body.sort_order === undefined || body.sort_order === null
        ? 0
        : parseInt(String(body.sort_order), 10);
    const is_active =
      body.is_active === undefined || body.is_active === null ? true : Boolean(body.is_active);

    const id = generateId();
    await execute(
      `INSERT INTO services (id, name, sort_order, is_active) VALUES (?, ?, ?, ?)`,
      [id, name, Number.isFinite(sort_order) ? sort_order : 0, is_active ? 1 : 0]
    );

    const row = (
      await query(`SELECT id, name, sort_order, is_active FROM services WHERE id = ?`, [id])
    )[0] as any;

    return NextResponse.json({
      success: true,
      message: 'Service created',
      data: { ...row, is_active: Boolean(row?.is_active), matrix_items: [] },
    });
  } catch (error: any) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
