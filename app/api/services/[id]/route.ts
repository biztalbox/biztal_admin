import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { execute, query, queryOne } from '@/lib/db';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const row = await queryOne(
      `SELECT id, name, sort_order, is_active, created_at, updated_at FROM services WHERE id = ?`,
      [params.id]
    );
    if (!row) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    const items = await query(
      `SELECT id, service_id, label, sort_order, is_active, created_at, updated_at
       FROM service_matrix_items
       WHERE service_id = ?
       ORDER BY sort_order ASC, label ASC`,
      [params.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        is_active: Boolean((row as any).is_active),
        matrix_items: (items as any[]).map((m) => ({ ...m, is_active: Boolean(m.is_active) })),
      },
    });
  } catch (error: any) {
    console.error('Get service error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

async function handlePut(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const existing = await queryOne('SELECT id FROM services WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('name = ?');
      values.push(name);
    }

    if (body.sort_order !== undefined && body.sort_order !== null) {
      const sort = parseInt(String(body.sort_order), 10);
      if (!Number.isFinite(sort)) {
        return NextResponse.json(
          { success: false, error: 'Invalid sort_order' },
          { status: 400 }
        );
      }
      updates.push('sort_order = ?');
      values.push(sort);
    }

    if (body.is_active !== undefined && body.is_active !== null) {
      updates.push('is_active = ?');
      values.push(Boolean(body.is_active) ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update' },
        { status: 400 }
      );
    }

    values.push(params.id);
    await execute(`UPDATE services SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

    const row = await queryOne(
      `SELECT id, name, sort_order, is_active FROM services WHERE id = ?`,
      [params.id]
    );
    return NextResponse.json({
      success: true,
      message: 'Service updated',
      data: row ? { ...row, is_active: Boolean((row as any).is_active) } : null,
    });
  } catch (error: any) {
    console.error('Update service error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
      { status: 500 }
    );
  }
}

async function handleDelete(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const existing = await queryOne('SELECT id FROM services WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    await execute('DELETE FROM services WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true, message: 'Service deleted' });
  } catch (error: any) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete service' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);
