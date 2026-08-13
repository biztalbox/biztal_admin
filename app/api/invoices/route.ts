import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query, queryOne, beginTransaction, commit, rollback } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getInvoicePrefix, getNextInvoiceNumberInTx } from '@/lib/invoice-number';
import { computeInvoiceGstTotals } from '@/lib/invoice-gst';

async function handleGet(req: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    const nextNumber = searchParams.get('next_number');

    // Get next invoice number for "Create Invoice" UI.
    if (nextNumber === '1') {
      const connection = await beginTransaction();
      try {
        const prefix = getInvoicePrefix(new Date());
        const invoice_number = await getNextInvoiceNumberInTx(connection, prefix);
        await commit(connection);
        return NextResponse.json({ success: true, data: { invoice_number } });
      } catch (error: any) {
        await rollback(connection);
        throw error;
      }
    }

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
      amount,
      discount = 0,
      status = 'DRAFT',
      due_date,
      issued_date,
      notes,
      items,
      currency = 'INR',
      currency_symbol = '₹',
      po_no,
      po_date,
      signature_image,
      gst_mode,
      sgst_igst_percent,
      cgst_percent,
    } = body;

    if (!client_id || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Client ID and amount are required' },
        { status: 400 }
      );
    }

    const gst = computeInvoiceGstTotals({
      amount,
      discount,
      gst_mode,
      sgst_igst_percent: sgst_igst_percent ?? (String(gst_mode || '').toUpperCase() === 'INTER' ? 18 : 9),
      cgst_percent: cgst_percent ?? 9,
    });

    const id = generateId();
    // Store project_ids as JSON string if provided
    const projectIdsJson = project_ids && Array.isArray(project_ids) && project_ids.length > 0
      ? JSON.stringify(project_ids)
      : null;

    const connection = await beginTransaction();
    let generatedInvoiceNumber: string | null = null;
    try {
      const prefix = getInvoicePrefix(new Date());
      const insertWithFallbacks = async (invoiceNo: string) => {
        // Try to insert with project_ids first
        try {
          await connection.execute(
            `INSERT INTO invoices (id, client_id, project_id, project_ids, invoice_number, amount, tax, gst_mode, sgst_igst_percent, cgst_percent, sgst_igst_amount, cgst_amount, discount, total_amount, status, due_date, issued_date, notes, po_no, po_date, signature_image, items, currency, currency_symbol)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              client_id,
              project_id || null,
              projectIdsJson,
              invoiceNo,
              parseFloat(amount),
              gst.tax,
              gst.gst_mode,
              gst.sgst_igst_percent,
              gst.cgst_percent,
              gst.sgst_igst_amount,
              gst.cgst_amount,
              parseFloat(discount || 0),
              gst.total_amount,
              status,
              due_date || null,
              issued_date || null,
              notes || null,
              po_no?.trim() || null,
              po_date || null,
              signature_image || null,
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
              await connection.execute(
                `INSERT INTO invoices (id, client_id, project_id, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items, currency, currency_symbol)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  id,
                  client_id,
                  project_id || null,
                  invoiceNo,
                  parseFloat(amount),
                  gst.tax,
                  parseFloat(discount || 0),
                  gst.total_amount,
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
                await connection.execute(
                  `INSERT INTO invoices (id, client_id, project_id, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    client_id,
                    project_id || null,
                    invoiceNo,
                    parseFloat(amount),
                    gst.tax,
                    parseFloat(discount || 0),
                    gst.total_amount,
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
            await connection.execute(
              `INSERT INTO invoices (id, client_id, project_id, project_ids, invoice_number, amount, tax, discount, total_amount, status, due_date, issued_date, notes, items)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                client_id,
                project_id || null,
                projectIdsJson,
                invoiceNo,
                parseFloat(amount),
                gst.tax,
                parseFloat(discount || 0),
                gst.total_amount,
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
      };

      // Best-effort retry if there's a unique constraint race.
      for (let attempt = 0; attempt < 5; attempt++) {
        generatedInvoiceNumber = await getNextInvoiceNumberInTx(connection, prefix);
        try {
          await insertWithFallbacks(generatedInvoiceNumber);
          break;
        } catch (error: any) {
          const msg = String(error?.message || '');
          const isDuplicate =
            error?.code === 'ER_DUP_ENTRY' ||
            msg.toLowerCase().includes('duplicate') ||
            msg.toLowerCase().includes('invoice_number');

          if (isDuplicate && attempt < 4) continue;
          throw error;
        }
      }

      await commit(connection);
    } catch (error: any) {
      await rollback(connection);
      throw error;
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

