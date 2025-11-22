import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM clients WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const clients = await query(sql, params);
    const totalResult = await queryOne('SELECT COUNT(*) as total FROM clients WHERE 1=1' + (search ? ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)' : ''), search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);
    const total = totalResult?.total || 0;

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, userId: string) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      whatsapp,
      company,
      address,
      city,
      state,
      zip_code,
      country,
      website,
      gst_no,
      contact_person,
      remark,
      status = 'ACTIVE',
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM clients WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    const id = generateId();
    await execute(
      `INSERT INTO clients (id, name, email, phone, whatsapp, company, address, city, state, zip_code, country, website, gst_no, contact_person, remark, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        email,
        phone || null,
        whatsapp || null,
        company || null,
        address || null,
        city || null,
        state || null,
        zip_code || null,
        country || null,
        website || null,
        gst_no || null,
        contact_person || null,
        remark || null,
        status,
      ]
    );

    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error: any) {
    console.error('Create client error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);

