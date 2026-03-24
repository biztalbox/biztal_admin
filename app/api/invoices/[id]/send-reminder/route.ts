import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, query } from '@/lib/db';
import { sendPaymentReminder as sendEmailReminder } from '@/lib/email';
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

    const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    const email = client.email;
    const reminderType = 'PAYMENT_REMINDER';
    let emailSent = false;
    let errors: string[] = [];

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client email not found. Cannot send reminder.',
        },
        { status: 400 }
      );
    }

    // Find the most recent invoice email to reply to
    // Try to get message_id, but handle if column doesn't exist
    let previousEmail: any = null;
    try {
      previousEmail = await queryOne(
        `SELECT message_id FROM reminder_history 
         WHERE invoice_id = ? AND channel = 'EMAIL' AND reminder_type = 'INVOICE_SENT' AND status = 'SENT'
         ORDER BY sent_at DESC LIMIT 1`,
        [invoice.id]
      );
    } catch (error: any) {
      // If message_id column doesn't exist, just continue without reply-to
      if (!error.message?.includes('message_id') && error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }

    let inReplyTo: string | undefined;
    let references: string | undefined;
    if (previousEmail && previousEmail.message_id) {
      inReplyTo = previousEmail.message_id;
      references = previousEmail.message_id;
    }

    const cc = parseSecondaryEmailsForCc(client.secondary_email, email);

    // Send Email
    try {
      const billToName = client.company || client.name;
      const result = await sendEmailReminder(
        email,
        billToName,
        invoice.invoice_number,
        parseFloat(invoice.total_amount),
        dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
        daysOverdue,
        inReplyTo,
        references,
        cc.length > 0 ? cc : undefined
      );
      
      // Log reminder history - try with message_id first, fallback if column doesn't exist
      try {
        await query(
          `INSERT INTO reminder_history (id, invoice_id, client_id, reminder_type, channel, message, subject, status, sent_at, created_at, message_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`,
          [
            generateId(),
            invoice.id,
            invoice.client_id,
            reminderType,
            'EMAIL',
            `Payment reminder sent for invoice #${invoice.invoice_number}`,
            `Payment Reminder - Invoice #${invoice.invoice_number}`,
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
              reminderType,
              'EMAIL',
              `Payment reminder sent for invoice #${invoice.invoice_number}`,
              `Payment Reminder - Invoice #${invoice.invoice_number}`,
              'SENT',
            ]
          );
        } else {
          throw error;
        }
      }
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

    // Update invoice reminder tracking
    await query(
      `UPDATE invoices SET 
       last_reminder_sent_at = CURRENT_TIMESTAMP,
       reminder_count = COALESCE(reminder_count, 0) + 1
       WHERE id = ?`,
      [invoice.id]
    );

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Reminder sent via Email',
        data: {
          emailSent,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send reminder.',
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

