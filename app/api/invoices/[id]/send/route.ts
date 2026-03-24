import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, query } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';
import { sendInvoiceEmail } from '@/lib/email';
import { generateId, parseSecondaryEmailsForCc } from '@/lib/utils';

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
    let project = null;
    if (invoice.project_id) {
      project = await queryOne('SELECT * FROM projects WHERE id = ?', [invoice.project_id]);
    }

    // Get all projects if project_ids exists (stored as JSON array)
    let projects: Array<{ name: string; budget: number }> = [];
    if (invoice.project_ids) {
      try {
        const projectIds = typeof invoice.project_ids === 'string' 
          ? JSON.parse(invoice.project_ids) 
          : invoice.project_ids;
        
        if (Array.isArray(projectIds) && projectIds.length > 0) {
          // Fetch all projects
          const placeholders = projectIds.map(() => '?').join(',');
          const projectsData = await query(
            `SELECT * FROM projects WHERE id IN (${placeholders})`,
            projectIds
          );
          
          projects = projectsData.map((p: any) => ({
            name: p.name,
            budget: p.budget ? parseFloat(p.budget) : 0,
          }));
        }
      } catch (e) {
        console.error('Error parsing project_ids:', e);
      }
    }

    // If no projects from project_ids but project_id exists, use single project
    if (projects.length === 0 && project) {
      projects = [{
        name: project.name,
        budget: project.budget ? parseFloat(project.budget) : 0,
      }];
    }

    // Parse items if it's a JSON string
    let items = null;
    if (invoice.items) {
      try {
        items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      } catch (e) {
        // If parsing fails, items will be null
        items = null;
      }
    }

    const invoiceData = {
      invoice_number: invoice.invoice_number,
      issued_date: invoice.issued_date,
      due_date: invoice.due_date,
      client: {
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code,
        country: client.country,
        gst_no: client.gst_no,
      },
      project: project ? {
        name: project.name,
        budget: project.budget ? parseFloat(project.budget) : 0,
      } : null,
      projects: projects.length > 0 ? projects : undefined,
      items: items,
      amount: parseFloat(invoice.amount),
      tax: parseFloat(invoice.tax || 0),
      discount: parseFloat(invoice.discount || 0),
      total_amount: parseFloat(invoice.total_amount),
      notes: invoice.notes,
      currency: invoice.currency || 'INR',
      currency_symbol: invoice.currency_symbol || '₹',
    };

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

