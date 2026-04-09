// @ts-ignore - jsPDF types may not be perfect
import jsPDF from 'jspdf';
import { getLogoBase64 } from './logo';

// Extend jsPDF type if needed
declare module 'jspdf' {
  interface jsPDF {
    splitTextToSize(text: string, maxWidth: number): string[];
  }
}

interface InvoiceData {
  invoice_number: string;
  issued_date?: string;
  due_date?: string;
  client: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    gst_no?: string;
  };
  project?: {
    name: string;
    budget: number;
  } | null;
  projects?: Array<{
    name: string;
    budget: number;
  }>;
  items?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  amount: number;
  tax: number;
  discount: number;
  total_amount: number;
  notes?: string;
  currency?: string;
  currency_symbol?: string;
}

const COMPANY_DETAILS = {
  name: 'BIZTALBOX MARKETING & BUSINESS CONSULTING PVT. LTD.',
  address: 'IST FLOOR, KHASRA NO.9/22, LIBASPUR, Shiv Mandir Road,',
  city: 'Swaroop Nagar, North West Delhi-110042',
  gstin: '07AANCB1128J1ZO',
  state: 'Delhi, Code : 07',
  contact: '+91 9485699709',
};

// Dark teal/green color: #2E8B57 (RGB: 46, 139, 87)
const DARK_TEAL = { r: 28, g: 105, b: 89 };
// Light gray: #F5F5F5 (RGB: 245, 245, 245)
const LIGHT_GRAY = { r: 245, g: 245, b: 245 };

// Helper to get logo as base64
// Note: For client-side compatibility, we return null here
// The logo should be embedded as base64 string or loaded via API route

export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  let yPos = margin;
  
  // Get currency symbol, default to ₹
  const currencySymbol = invoice.currency_symbol || '₹';
  const currencyCode = invoice.currency || 'INR';

  // ========== HEADER SECTION ==========
  
  // Logo at top left
  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', margin, yPos, 45, 25);
    } catch (error) {
      console.error('Error adding logo image:', error);
    }
  }

  // "TAX INVOICE" Banner (Top Right) - Dark teal/green background
  const bannerWidth = 100;
  const bannerHeight = 17;
  const bannerX = pageWidth - margin - bannerWidth;
  const bannerY = yPos;
  
  doc.setFillColor(DARK_TEAL.r, DARK_TEAL.g, DARK_TEAL.b);
  doc.rect(bannerX, bannerY, bannerWidth, bannerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('sans-serif', 'bold');
  doc.text('TAX INVOICE', bannerX + bannerWidth / 2, bannerY + bannerHeight / 2 + 4, { align: 'center' });

  // Company Details below "TAX INVOICE" banner
  yPos = bannerY + bannerHeight + 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('sans-serif', 'normal');
  doc.text(COMPANY_DETAILS.name, bannerX, yPos);
  yPos += 5;
  doc.text(COMPANY_DETAILS.address, bannerX, yPos);
  yPos += 5;
  doc.text(COMPANY_DETAILS.city, bannerX, yPos);

  // ========== HORIZONTAL SEPARATOR LINE ==========
  yPos = margin + 40;
  doc.setDrawColor(DARK_TEAL.r, DARK_TEAL.g, DARK_TEAL.b);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ========== LEFT COLUMN - SENDER/COMPANY INFORMATION ==========
  const leftColumnX = margin;
  const rightColumnX = pageWidth / 2 + 10;
  
  doc.setFontSize(10);
  doc.setFont('sans-serif', 'bold');
  doc.text('GSTIN/UIN:', leftColumnX, yPos);
  doc.setFont('sans-serif', 'normal'); // Use courier for GST number
  doc.text(COMPANY_DETAILS.gstin, leftColumnX + 35, yPos);
  doc.setFont('sans-serif', 'normal'); // Reset to default font
  
  yPos += 6;
  doc.setFont('sans-serif', 'bold');
  doc.text('State Name:', leftColumnX, yPos);
  doc.setFont('sans-serif', 'normal');
  doc.text(COMPANY_DETAILS.state, leftColumnX + 35, yPos);
  
  yPos += 6;
  doc.setFont('sans-serif', 'bold');
  doc.text('Contact:', leftColumnX, yPos);
  doc.setFont('sans-serif', 'normal');
  doc.text(COMPANY_DETAILS.contact, leftColumnX + 35, yPos);

  yPos += 17;

  // "Bill To:" Section
  doc.setFont('sans-serif', 'bold');
  doc.setFontSize(12);
  doc.text('Bill To:', leftColumnX, yPos);
  
  yPos += 7;
  doc.setFont('sans-serif', 'normal');
  doc.setFontSize(10);
  // Use company name if available, otherwise use client name
  const billToName = invoice.client.company || invoice.client.name;
  doc.text(billToName, leftColumnX, yPos);
  
  if (invoice.client.phone) {
    yPos += 6;
    doc.text(`Phone: ${invoice.client.phone}`, leftColumnX, yPos);
  }
  
  if (invoice.client.address) {
    yPos += 6;
    const addressLines = doc.splitTextToSize(invoice.client.address, 80);
    doc.text(addressLines, leftColumnX, yPos);
    yPos += (addressLines.length - 1) * 6;
  }
  
  // if (invoice.client.city || invoice.client.state || invoice.client.zip_code) {
  //   yPos += 6;
  //   const cityState = [invoice.client.city, invoice.client.state, invoice.client.zip_code].filter(Boolean).join(', ');
  //   doc.text(cityState, leftColumnX, yPos);
  // }
  
  if (invoice.client.gst_no) {
    yPos += 6;
    doc.setFont('sans-serif', 'normal');
    doc.text('GST: ', leftColumnX, yPos);
    doc.setFont('sans-serif', 'normal'); // Use courier for GST number
    doc.text(invoice.client.gst_no, leftColumnX + 10, yPos);
    doc.setFont('sans-serif', 'normal'); // Reset to default font
  }


  // ========== RIGHT COLUMN - INVOICE DETAILS ==========
  yPos = margin + 60;
  doc.setFont('sans-serif', 'bold');
  doc.setFontSize(12);
  doc.text('Invoice Details', rightColumnX, yPos);
  
  yPos += 7;
  doc.setFont('sans-serif', 'bold');
  doc.setFontSize(10);
  doc.text('Invoice #:', rightColumnX, yPos);
  doc.setFont('sans-serif', 'normal');
  doc.text(invoice.invoice_number, rightColumnX + 30, yPos);
  
  if (invoice.issued_date) {
    yPos += 6;
    doc.setFont('sans-serif', 'bold');
    doc.text('Date:', rightColumnX, yPos);
    doc.setFont('sans-serif', 'normal');
    const issuedDate = new Date(invoice.issued_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(issuedDate, rightColumnX + 30, yPos);
  }
  
  if (invoice.due_date) {
    yPos += 6;
    doc.setFont('sans-serif', 'bold');
    doc.text('Due Date:', rightColumnX, yPos);
    doc.setFont('sans-serif', 'normal');
    const dueDate = new Date(invoice.due_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(dueDate, rightColumnX + 30, yPos);
  }

  // ========== MAIN CONTENT TABLE ==========
  yPos = Math.max(yPos, margin + 100) + 15;
  
  // Table Header - Dark teal/green banner
  const tableHeaderHeight = 10;
  doc.setFillColor(DARK_TEAL.r, DARK_TEAL.g, DARK_TEAL.b);
  doc.rect(margin, yPos, pageWidth - 2 * margin, tableHeaderHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('sans-serif', 'bold');
  doc.setFontSize(10);
  const colWidth = (pageWidth - 2 * margin) / 2;
  doc.text('DESCRIPTION', margin + colWidth * 0.5, yPos + 8, { align: 'center' });
  doc.text(`AMOUNT (${currencyCode})`, margin + colWidth * 1.5, yPos + 8, { align: 'center' });

  yPos += tableHeaderHeight;

  // Table Rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('sans-serif', 'normal');
  doc.setFontSize(9);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // Priority: Use projects array if available, then items, then default
  if (invoice.projects && invoice.projects.length > 0) {
    // Display each project as a row
    invoice.projects.forEach((project, index) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }
      
      // Light gray background for rows
      if (index % 2 === 0) {
        doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      }
      
      // Project name in description column
      const projectNameLines = doc.splitTextToSize(project.name, colWidth - 5);
      doc.text(projectNameLines, margin + 5, yPos + 6);
      
      // Budget in amount column
      const budgetValue = parseFloat(project.budget.toString()) || 0;
      doc.setFont('arial', 'normal'); // Use arial for numbers
      if (budgetValue >= 1) {
        doc.text(`${budgetValue.toFixed(2)}`, margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      } else {
        doc.text('-', margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      }
      doc.setFont('sans-serif', 'normal'); // Reset to default font
      
      yPos += Math.max(10, projectNameLines.length * 6);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    });
  } else if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }
      
      // Light gray background for rows
      if (index % 2 === 0) {
        doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      }
      
      const descLines = doc.splitTextToSize(item.description, colWidth - 5);
      doc.text(descLines, margin + 5, yPos + 6);
      
      // Right-aligned numbers - use arial font for better number readability
      doc.setFont('arial', 'normal');
      doc.text(`${item.amount.toFixed(2)}`, margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      doc.setFont('sans-serif', 'normal'); // Reset to default font
      
      yPos += Math.max(10, descLines.length * 6);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    });
  } else {
    // Default single item - use project if available, otherwise use "Service/Product"
    doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
    
    if (invoice.project && invoice.project.name) {
      // Use project name
      const projectNameLines = doc.splitTextToSize(invoice.project.name, colWidth - 5);
      doc.text(projectNameLines, margin + 5, yPos + 6);
      
      const budgetValue = parseFloat(invoice.project.budget.toString()) || 0;
      doc.setFont('arial', 'normal'); // Use arial for numbers
      if (budgetValue >= 1) {
        doc.text(`${budgetValue.toFixed(2)}`, margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      } else {
        doc.text('-', margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      }
      doc.setFont('sans-serif', 'normal'); // Reset to default font
    } else {
      // Fallback to Service/Product
      doc.text('Service/Product', margin + 5, yPos + 6);
      doc.setFont('arial', 'normal'); // Use arial for numbers
      doc.text(`${invoice.amount.toFixed(2)}`, margin + colWidth * 1.5, yPos + 6, { align: 'right' });
      doc.setFont('sans-serif', 'normal'); // Reset to default font
    }
    yPos += 12;
  }

  yPos += 10;

  // ========== SUMMARY SECTION ==========
  const summaryX = margin + colWidth * 0.5;
  const summaryWidth = colWidth * 1.5;
  
  if (invoice.discount > 0) {
    doc.setFont('sans-serif', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', summaryX, yPos);
    doc.setFont('arial', 'normal'); // Use arial for numbers
    doc.text(`${invoice.amount.toFixed(2)}`, margin + colWidth * 1.5, yPos, { align: 'right' });
    doc.setFont('sans-serif', 'normal'); // Reset to default font
    yPos += 8;
    
    doc.setFont('sans-serif', 'normal');
    doc.text('Discount:', summaryX, yPos);
    doc.setFont('arial', 'normal'); // Use arial for numbers
    doc.text(`-${invoice.discount.toFixed(2)}`, margin + colWidth * 1.5, yPos, { align: 'right' });
    doc.setFont('sans-serif', 'normal'); // Reset to default font
    yPos += 8;
  }
  
  if (invoice.tax > 0) {
    doc.setFont('sans-serif', 'normal');
    doc.setFontSize(10);
    doc.text('Tax:', summaryX, yPos);
    doc.setFont('arial', 'normal'); // Use arial for numbers
    doc.text(`${invoice.tax.toFixed(2)}`, margin + colWidth * 1.5, yPos, { align: 'right' });
    doc.setFont('sans-serif', 'normal'); // Reset to default font
    yPos += 8;
  }

  // Total Amount with light gray background
  doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
  doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 12, 'F');
  
  doc.setFont('sans-serif', 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount:', summaryX, yPos + 5);
  doc.setFont('arial', 'bold'); // Use arial for numbers
  doc.text(`${invoice.total_amount.toFixed(2)}`, margin + colWidth * 1.5, yPos + 5, { align: 'right' });
  doc.setFont('sans-serif', 'normal'); // Reset to default font

  yPos += 20;

  // ========== NOTES SECTION ==========
  if (invoice.notes) {
    doc.setFont('sans-serif', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Notes:', margin, yPos);
    
    yPos += 7;
    doc.setFont('sans-serif', 'bold');
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5;
  }

  // ========== FOOTER SECTION ==========
  yPos = pageHeight - 20;
  
  // Dark teal/green separator line
  doc.setDrawColor(DARK_TEAL.r, DARK_TEAL.g, DARK_TEAL.b);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 10;
  doc.setFont('sans-serif', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('This is a computer-generated invoice.', pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(invoice: InvoiceData, filename?: string): void {
  const doc = generateInvoicePDF(invoice);
  const invoiceFilename = filename || `Invoice_${invoice.invoice_number}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(invoiceFilename);
}
