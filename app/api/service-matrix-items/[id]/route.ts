import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { execute, queryOne } from '@/lib/db';

async function handlePut(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const existing = await queryOne(
      `SELECT id, service_id FROM service_matrix_items WHERE id = ?`,
      [params.id]
    );
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Matrix row not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.label !== undefined) {
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!label) {
        return NextResponse.json(
          { success: false, error: 'Label cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('label = ?');
      values.push(label);
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
    await execute(
      `UPDATE service_matrix_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const row = await queryOne(
      `SELECT id, service_id, label, sort_order, is_active FROM service_matrix_items WHERE id = ?`,
      [params.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Matrix row updated',
      data: row ? { ...row, is_active: Boolean((row as any).is_active) } : null,
    });
  } catch (error: any) {
    console.error('Update matrix row error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update matrix row' },
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
    const existing = await queryOne(`SELECT id FROM service_matrix_items WHERE id = ?`, [
      params.id,
    ]);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Matrix row not found' }, { status: 404 });
    }

    await execute('DELETE FROM service_matrix_items WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true, message: 'Matrix row deleted' });
  } catch (error: any) {
    console.error('Delete matrix row error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete matrix row' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);
