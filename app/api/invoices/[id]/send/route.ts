import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, query } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';
import { sendInvoiceEmail } from '@/lib/email';
import { generateId, parseSecondaryEmailsForCc } from '@/lib/utils';
import {
  assembleInvoicePdfData,
  parseInvoiceItems,
  resolveInvoiceProjects,
} from '@/lib/invoice-pdf-data';

async function handlePost(
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

    // Get client details
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [invoice.client_id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    if (!client.email) {
      return NextResponse.json(
        { success: false, error: 'Client email not found' },
        { status: 400 }
      );
    }

    // Get project details if project_id exists (for backward compatibility)
    const { project, projects } = await resolveInvoiceProjects(invoice);
    const items = parseInvoiceItems(invoice);
    const invoiceData = assembleInvoicePdfData(invoice, client, {
      project,
      projects,
      items,
    });

    // Generate PDF
    const pdf = generateInvoicePDF(invoiceData);
    const pdfOutput = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfOutput);

    // Format dates
    const dueDate = invoice.due_date 
      ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : undefined;

    // Send email with PDF attachment
    const billToName = client.company || client.name;
    const cc = parseSecondaryEmailsForCc(client.secondary_email, client.email);

    const result = await sendInvoiceEmail(
      client.email,
      billToName,
      invoice.invoice_number,
      parseFloat(invoice.total_amount),
      dueDate,
      pdfBuffer,
      cc.length > 0 ? cc : undefined
    );

    if (result.success) {
      // Log email history - try with message_id first, fallback if column doesn't exist
      try {
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, sent_at, created_at, message_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            'INVOICE_SENT',
            'EMAIL',
            `Invoice #${invoice.invoice_number} sent to client`,
            `Invoice #${invoice.invoice_number} - ${process.env.SMTP_FROM_NAME || 'BIZTALBOX MARKETING & BUSINESS CONSULTING PVT. LTD.'}`,
            'SENT',
            result.messageId || null,
          ]
        );
      } catch (error: any) {
        // If message_id column doesn't exist, insert without it
        if (error.message?.includes('message_id') || error.code === 'ER_BAD_FIELD_ERROR') {
          await query(
            `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, sent_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              generateId(),
              invoice.id,
              invoice.client_id,
              'INVOICE_SENT',
              'EMAIL',
              `Invoice #${invoice.invoice_number} sent to client`,
              `Invoice #${invoice.invoice_number} - ${process.env.SMTP_FROM_NAME || 'BIZTALBOX MARKETING & BUSINESS CONSULTING PVT. LTD.'}`,
              'SENT',
            ]
          );
        } else {
          throw error;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice sent successfully',
        data: {
          messageId: result.messageId,
        },
      });
    } else {
      // Log failed attempt
      await query(
        `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          generateId(),
          invoice.id,
          invoice.client_id,
          'INVOICE_SENT',
          'EMAIL',
          `Failed to send invoice #${invoice.invoice_number}`,
          `Invoice #${invoice.invoice_number} - ${process.env.SMTP_FROM_NAME || 'BIZTALBOX MARKETING & BUSINESS CONSULTING PVT. LTD.'}`,
          'FAILED',
          result.error || 'Unknown error',
        ]
      );

      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send invoice' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Send invoice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send invoice' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);

