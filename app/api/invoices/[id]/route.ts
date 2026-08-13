import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, execute } from '@/lib/db';
import { computeInvoiceGstTotals } from '@/lib/invoice-gst';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [params.id]);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoice' },
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
      project_id,
      project_ids,
      invoice_number,
      amount,
      discount = 0,
      status,
      due_date,
      issued_date,
      paid_date,
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

    if (!invoice_number || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Invoice number and amount are required' },
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

    const existing = await queryOne('SELECT id FROM invoices WHERE id = ?', [params.id]);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice number is taken by another invoice
    const numberCheck = await queryOne('SELECT id FROM invoices WHERE invoice_number = ? AND id != ?', [invoice_number, params.id]);
    if (numberCheck) {
      return NextResponse.json(
        { success: false, error: 'Invoice number already exists' },
        { status: 400 }
      );
    }

    // Store project_ids as JSON string if provided
    const projectIdsJson = project_ids && Array.isArray(project_ids) && project_ids.length > 0
      ? JSON.stringify(project_ids)
      : null;
    
    // Try to update with project_ids first
    try {
      await execute(
        `UPDATE invoices SET project_id = ?, project_ids = ?, invoice_number = ?, amount = ?, tax = ?, gst_mode = ?, sgst_igst_percent = ?, cgst_percent = ?, sgst_igst_amount = ?, cgst_amount = ?, discount = ?, total_amount = ?, status = ?, due_date = ?, issued_date = ?, paid_date = ?, notes = ?, po_no = ?, po_date = ?, signature_image = ?, items = ?, currency = ?, currency_symbol = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          project_id || null,
          projectIdsJson,
          invoice_number,
          parseFloat(amount),
          gst.tax,
          gst.gst_mode,
          gst.sgst_igst_percent,
          gst.cgst_percent,
          gst.sgst_igst_amount,
          gst.cgst_amount,
          parseFloat(discount || 0),
          gst.total_amount,
          status || 'DRAFT',
          due_date || null,
          issued_date || null,
          paid_date || null,
          notes || null,
          po_no?.trim() || null,
          po_date || null,
          signature_image || null,
          items ? JSON.stringify(items) : null,
          currency || 'INR',
          currency_symbol || '₹',
          params.id,
        ]
      );
    } catch (error: any) {
      // If project_ids column doesn't exist, log warning and try without it
      if (error.message.includes('project_ids')) {
        console.warn('project_ids column does not exist. Please run migration: database_migrations_project_ids.sql');
        try {
          await execute(
            `UPDATE invoices SET project_id = ?, invoice_number = ?, amount = ?, tax = ?, discount = ?, total_amount = ?, status = ?, due_date = ?, issued_date = ?, paid_date = ?, notes = ?, items = ?, currency = ?, currency_symbol = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              project_id || null,
              invoice_number,
              parseFloat(amount),
              gst.tax,
              parseFloat(discount || 0),
              gst.total_amount,
              status || 'DRAFT',
              due_date || null,
              issued_date || null,
              paid_date || null,
              notes || null,
              items ? JSON.stringify(items) : null,
              currency || 'INR',
              currency_symbol || '₹',
              params.id,
            ]
          );
        } catch (fallbackError: any) {
          // If currency columns also don't exist, try without them
          if (fallbackError.message.includes('currency')) {
            await execute(
              `UPDATE invoices SET project_id = ?, invoice_number = ?, amount = ?, tax = ?, discount = ?, total_amount = ?, status = ?, due_date = ?, issued_date = ?, paid_date = ?, notes = ?, items = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [
                project_id || null,
                invoice_number,
                parseFloat(amount),
                gst.tax,
                parseFloat(discount || 0),
                gst.total_amount,
                status || 'DRAFT',
                due_date || null,
                issued_date || null,
                paid_date || null,
                notes || null,
                items ? JSON.stringify(items) : null,
                params.id,
              ]
            );
          } else {
            throw fallbackError;
          }
        }
      } else if (error.message.includes('currency')) {
        // If only currency columns don't exist
        await execute(
          `UPDATE invoices SET project_id = ?, project_ids = ?, invoice_number = ?, amount = ?, tax = ?, discount = ?, total_amount = ?, status = ?, due_date = ?, issued_date = ?, paid_date = ?, notes = ?, items = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            project_id || null,
            projectIdsJson,
            invoice_number,
            parseFloat(amount),
            gst.tax,
            parseFloat(discount || 0),
            gst.total_amount,
            status || 'DRAFT',
            due_date || null,
            issued_date || null,
            paid_date || null,
            notes || null,
            items ? JSON.stringify(items) : null,
            params.id,
          ]
        );
      } else {
        throw error;
      }
    }

    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update invoice' },
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
    const invoice = await queryOne('SELECT id FROM invoices WHERE id = ?', [params.id]);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM invoices WHERE id = ?', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);

