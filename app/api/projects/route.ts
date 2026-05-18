import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query, queryOne, beginTransaction, commit, rollback } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { fetchProjectServicesDetail, syncProjectServicesDeliverables } from '@/lib/project-services';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');

    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (clientId) {
      sql += ' AND client_id = ?';
      params.push(clientId);
    }

    sql += ' ORDER BY created_at DESC';

    const projects = await query(sql, params);
    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, userId: string) {
  try {
    const body = await req.json();
    const {
      client_id,
      name,
      description,
      status = 'ACTIVE',
      start_date,
      end_date,
      budget,
      notes,
    } = body;

    if (!client_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Client ID and name are required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const conn = await beginTransaction();
    try {
      await conn.execute(
        `INSERT INTO projects (id, client_id, name, description, status, start_date, end_date, budget, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          client_id,
          name,
          description || null,
          status,
          start_date || null,
          end_date || null,
          budget ? parseFloat(budget) : null,
          notes || null,
        ]
      );
      await syncProjectServicesDeliverables(conn, id, body.services);
      await commit(conn);
    } catch (innerErr: any) {
      await rollback(conn);
      console.error('Create project transactional error:', innerErr);
      return NextResponse.json(
        {
          success: false,
          error:
            typeof innerErr?.message === 'string'
              ? innerErr.message
              : 'Failed to create project',
        },
        { status: 400 }
      );
    }

    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [id]);
    let services_detail: unknown[] = [];
    try {
      services_detail = await fetchProjectServicesDetail(id);
    } catch {
      services_detail = [];
    }
    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: project ? { ...project, services_detail } : null,
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);

