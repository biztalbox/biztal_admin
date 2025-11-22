import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');

    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (clientId) {
      sql += ' AND client_id = ?';
      params.push(clientId);
    }

    sql += ' ORDER BY created_at DESC';

    const invoices = await query(sql, params);
    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, userId: string) {
  try {
    const body = await req.json();
    const {
      client_id,
      project_id,
      project_ids,
      invoice_number,
      amount,
      tax = 0,
      discount = 0,
      total_amount,
      status = 'DRAFT',
      due_date,
      issued_date,
      notes,
      items,
      currency = 'INR',
      currency_symbol = '₹',
    } = body;

    if (!client_id || !invoice_number || amount === undefined || total_amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Client ID, invoice number, amount, and total amount are required' },
        { status: 400 }
      );
    }

    // Check if invoice number already exists
    const existing = await queryOne('SELECT id FROM invoices WHERE invoice_number = ?', [invoice_number]);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice number already exists' },
        { status: 400 }
      );
    }

    const id = generateId();
    // Store project_ids as JSON string if provided
    const projectIdsJson = project_ids && Array.isArray(project_ids) && project_ids.length > 0
      ? JSON.stringify(project_ids)
      : null;
    
    // Try to insert with project_ids first
    try {
      await execute(
        `INSERT INTO invoices (id, client_id, project_id, project_ids, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items, currency, currency_symbol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          client_id,
          project_id || null,
          projectIdsJson,
          invoice_number,
          parseFloat(amount),
          parseFloat(tax || 0),
          parseFloat(discount || 0),
          parseFloat(total_amount),
          status,
          due_date || null,
          issued_date || null,
          notes || null,
          items ? JSON.stringify(items) : null,
          currency || 'INR',
          currency_symbol || '₹',
        ]
      );
    } catch (error: any) {
      // If project_ids column doesn't exist, log warning and try without it
      if (error.message.includes('project_ids')) {
        console.warn('project_ids column does not exist. Please run migration: database_migrations_project_ids.sql');
        try {
          await execute(
            `INSERT INTO invoices (id, client_id, project_id, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items, currency, currency_symbol)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              client_id,
              project_id || null,
              invoice_number,
              parseFloat(amount),
              parseFloat(tax || 0),
              parseFloat(discount || 0),
              parseFloat(total_amount),
              status,
              due_date || null,
              issued_date || null,
              notes || null,
              items ? JSON.stringify(items) : null,
              currency || 'INR',
              currency_symbol || '₹',
            ]
          );
        } catch (fallbackError: any) {
          // If currency columns also don't exist, try without them
          if (fallbackError.message.includes('currency')) {
            await execute(
              `INSERT INTO invoices (id, client_id, project_id, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                client_id,
                project_id || null,
                invoice_number,
                parseFloat(amount),
                parseFloat(tax || 0),
                parseFloat(discount || 0),
                parseFloat(total_amount),
                status,
                due_date || null,
                issued_date || null,
                notes || null,
                items ? JSON.stringify(items) : null,
              ]
            );
          } else {
            throw fallbackError;
          }
        }
      } else if (error.message.includes('currency')) {
        // If only currency columns don't exist
        await execute(
          `INSERT INTO invoices (id, client_id, project_id, project_ids, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            client_id,
            project_id || null,
            projectIdsJson,
            invoice_number,
            parseFloat(amount),
            parseFloat(tax || 0),
            parseFloat(discount || 0),
            parseFloat(total_amount),
            status,
            due_date || null,
            issued_date || null,
            notes || null,
            items ? JSON.stringify(items) : null,
          ]
        );
      } else {
        throw error;
      }
    }

    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);

