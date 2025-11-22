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

    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR employee_id LIKE ? OR designation LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const employees = await query(sql, params);
    const totalResult = await queryOne(
      'SELECT COUNT(*) as total FROM employees WHERE 1=1' + 
      (search ? ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR employee_id LIKE ? OR designation LIKE ?)' : ''),
      search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []
    );
    const total = totalResult?.total || 0;

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, userId: string) {
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
      status = 'ACTIVE',
      address,
      emergency_contact,
    } = body;

    if (!name || !email || !designation) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and designation are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Generate employee_id if not provided
    let finalEmployeeId = employee_id;
    if (!finalEmployeeId) {
      const lastEmployee = await queryOne('SELECT employee_id FROM employees ORDER BY created_at DESC LIMIT 1', []);
      if (lastEmployee && lastEmployee.employee_id) {
        const lastNum = parseInt(lastEmployee.employee_id.replace(/[^0-9]/g, '')) || 0;
        finalEmployeeId = `EMP${String(lastNum + 1).padStart(4, '0')}`;
      } else {
        finalEmployeeId = 'EMP0001';
      }
    }

    // Check if employee_id already exists
    const existingId = await queryOne('SELECT id FROM employees WHERE employee_id = ?', [finalEmployeeId]);
    if (existingId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID already exists' },
        { status: 400 }
      );
    }

    const id = generateId();
    await execute(
      `INSERT INTO employees (id, employee_id, name, email, phone, designation, department, joining_date, salary, status, address, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        finalEmployeeId,
        name,
        email,
        phone || null,
        designation,
        department || null,
        joining_date || null,
        salary ? parseFloat(salary) : null,
        status,
        address || null,
        emergency_contact || null,
      ]
    );

    const employee = await queryOne('SELECT * FROM employees WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create employee' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);

