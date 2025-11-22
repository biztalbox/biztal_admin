import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, query } from '@/lib/db';
import { sendPaymentReminder as sendWhatsAppReminder } from '@/lib/whatsapp';
import { sendPaymentReminder as sendEmailReminder } from '@/lib/email';
import { generateId } from '@/lib/utils';

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

    const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    const phone = client.whatsapp || client.phone;
    const email = client.email;
    const reminderType = 'PAYMENT_REMINDER';
    let whatsappSent = false;
    let emailSent = false;
    let errors: string[] = [];

    // Send WhatsApp
    if (phone) {
      try {
        await sendWhatsAppReminder(
          phone,
          client.name,
          invoice.invoice_number,
          parseFloat(invoice.total_amount),
          dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
          daysOverdue
        );
        
        // Log reminder history
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, status, sent_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            reminderType,
            'WHATSAPP',
            `Payment reminder sent for invoice #${invoice.invoice_number}`,
            'SENT',
          ]
        );
        whatsappSent = true;
      } catch (error) {
        console.error('WhatsApp send error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`WhatsApp: ${errorMsg}`);
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, status, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            reminderType,
            'WHATSAPP',
            `Payment reminder for invoice #${invoice.invoice_number}`,
            'FAILED',
            errorMsg,
          ]
        );
      }
    }

    // Send Email
    if (email) {
      try {
        await sendEmailReminder(
          email,
          client.name,
          invoice.invoice_number,
          parseFloat(invoice.total_amount),
          dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
          daysOverdue
        );
        
        // Log reminder history
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, sent_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            reminderType,
            'EMAIL',
            `Payment reminder sent for invoice #${invoice.invoice_number}`,
            `Payment Reminder - Invoice #${invoice.invoice_number}`,
            'SENT',
          ]
        );
        emailSent = true;
      } catch (error) {
        console.error('Email send error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Email: ${errorMsg}`);
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            reminderType,
            'EMAIL',
            `Payment reminder for invoice #${invoice.invoice_number}`,
            `Payment Reminder - Invoice #${invoice.invoice_number}`,
            'FAILED',
            errorMsg,
          ]
        );
      }
    }

    // Update invoice reminder tracking
    await query(
      `UPDATE invoices SET 
       last_reminder_sent_at = CURRENT_TIMESTAMP,
       reminder_count = COALESCE(reminder_count, 0) + 1
       WHERE id = ?`,
      [invoice.id]
    );

    if (whatsappSent || emailSent) {
      return NextResponse.json({
        success: true,
        message: `Reminder sent${whatsappSent && emailSent ? ' via WhatsApp and Email' : whatsappSent ? ' via WhatsApp' : ' via Email'}`,
        data: {
          whatsappSent,
          emailSent,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send reminder. No contact method available or all methods failed.',
          errors,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send reminder' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);

