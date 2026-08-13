import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';
import {
  assembleInvoicePdfData,
  parseInvoiceItems,
  resolveInvoiceProjects,
} from '@/lib/invoice-pdf-data';

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

    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [invoice.client_id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const { project, projects } = await resolveInvoiceProjects(invoice);
    const items = parseInvoiceItems(invoice);
    const invoiceData = assembleInvoicePdfData(invoice, client, {
      project,
      projects,
      items,
    });

    const pdf = generateInvoicePDF(invoiceData);
    const pdfOutput = pdf.output('arraybuffer');
    const buffer = Buffer.from(pdfOutput);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Export invoice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export invoice' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
