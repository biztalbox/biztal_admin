import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, execute, beginTransaction, commit, rollback } from '@/lib/db';
import { fetchProjectServicesDetail, syncProjectServicesDeliverables } from '@/lib/project-services';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [params.id]);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    let services_detail: unknown[] = [];
    try {
      services_detail = await fetchProjectServicesDetail(params.id);
    } catch {
      services_detail = [];
    }
    return NextResponse.json({
      success: true,
      data: { ...project, services_detail },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project' },
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
    const body = await req.json();
    const {
      name,
      description,
      status,
      start_date,
      end_date,
      budget,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const existing = await queryOne('SELECT id FROM projects WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const conn = await beginTransaction();
    try {
      await conn.execute(
        `UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, budget = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [
          name,
          description || null,
          status || 'ACTIVE',
          start_date || null,
          end_date || null,
          budget ? parseFloat(budget) : null,
          notes || null,
          params.id,
        ]
      );
      await syncProjectServicesDeliverables(conn, params.id, body.services);
      await commit(conn);
    } catch (innerErr: any) {
      await rollback(conn);
      console.error('Update project transactional error:', innerErr);
      return NextResponse.json(
        {
          success: false,
          error:
            typeof innerErr?.message === 'string'
              ? innerErr.message
              : 'Failed to update project',
        },
        { status: 400 }
      );
    }

    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [params.id]);
    let services_detail: unknown[] = [];
    try {
      services_detail = params.id ? await fetchProjectServicesDetail(params.id) : [];
    } catch {
      services_detail = [];
    }
    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: { ...project, services_detail },
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project' },
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
    const project = await queryOne('SELECT id FROM projects WHERE id = ?', [params.id]);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM projects WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);

