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
    const employee = await queryOne('SELECT * FROM employees WHERE id = ?', [params.id]);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch employee' },
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
      employee_id,
      name,
      email,
      phone,
      designation,
      department,
      joining_date,
      salary,
      status,
      address,
      emergency_contact,
    } = body;

    if (!name || !email || !designation) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and designation are required' },
        { status: 400 }
      );
    }

    const existing = await queryOne('SELECT id FROM employees WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if email is taken by another employee
    const emailCheck = await queryOne('SELECT id FROM employees WHERE email = ? AND id != ?', [email, params.id]);
    if (emailCheck) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if employee_id is taken by another employee
    if (employee_id) {
      const idCheck = await queryOne('SELECT id FROM employees WHERE employee_id = ? AND id != ?', [employee_id, params.id]);
      if (idCheck) {
        return NextResponse.json(
          { success: false, error: 'Employee ID already exists' },
          { status: 400 }
        );
      }
    }

    await execute(
      `UPDATE employees SET employee_id = ?, name = ?, email = ?, phone = ?, designation = ?, department = ?, joining_date = ?, salary = ?, status = ?, address = ?, emergency_contact = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        employee_id || existing.employee_id,
        name,
        email,
        phone || null,
        designation,
        department || null,
        joining_date || null,
        salary ? parseFloat(salary) : null,
        status || 'ACTIVE',
        address || null,
        emergency_contact || null,
        params.id,
      ]
    );

    const employee = await queryOne('SELECT * FROM employees WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (error: any) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update employee' },
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
    const employee = await queryOne('SELECT id FROM employees WHERE id = ?', [params.id]);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM employees WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);

