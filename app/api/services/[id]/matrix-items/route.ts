import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { execute, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';

async function handlePost(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const parent = await queryOne('SELECT id FROM services WHERE id = ?', [params.id]);
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) {
      return NextResponse.json(
        { success: false, error: 'Label is required' },
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
      `INSERT INTO service_matrix_items (id, service_id, label, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [id, params.id, label, Number.isFinite(sort_order) ? sort_order : 0, is_active ? 1 : 0]
    );

    const row = await queryOne(
      `SELECT id, service_id, label, sort_order, is_active FROM service_matrix_items WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Matrix row created',
      data: row ? { ...row, is_active: Boolean((row as any).is_active) } : null,
    });
  } catch (error: any) {
    console.error('Create matrix row error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create matrix row' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);
