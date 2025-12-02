import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';
import crypto from 'crypto';

// Generate a shareable token for an invoice
// In production, you might want to store this in the database with expiration
function generateShareToken(invoiceId: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const data = `${invoiceId}-${Date.now()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
}

async function handleGet(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [params.id]);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // For now, we'll allow access with just the invoice ID
    // In production, validate the token here
    // if (!token || !validateToken(token, params.id)) {
    //   return NextResponse.json(
    //     { success: false, error: 'Invalid or missing token' },
    //     { status: 401 }
    //   );
    // }

    // Get client details
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [invoice.client_id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
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

    const pdf = generateInvoicePDF(invoiceData);
    const pdfOutput = pdf.output('arraybuffer');
    const buffer = Buffer.from(pdfOutput);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice_${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Public invoice export error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export invoice' },
      { status: 500 }
    );
  }
}

export const GET = handleGet;

