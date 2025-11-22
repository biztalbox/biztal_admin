import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, execute } from '@/lib/db';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [params.id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch client' },
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
      status,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const existing = await queryOne('SELECT id FROM clients WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if email is taken by another client
    const emailCheck = await queryOne('SELECT id FROM clients WHERE email = ? AND id != ?', [email, params.id]);
    if (emailCheck) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    await execute(
      `UPDATE clients SET name = ?, email = ?, phone = ?, whatsapp = ?, company = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ?, website = ?, gst_no = ?, contact_person = ?, remark = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
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
        status || 'ACTIVE',
        params.id,
      ]
    );

    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error: any) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update client' },
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
    const client = await queryOne('SELECT id FROM clients WHERE id = ?', [params.id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM clients WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);

