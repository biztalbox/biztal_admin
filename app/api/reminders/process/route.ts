import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendPaymentReminder as sendWhatsAppReminder } from '@/lib/whatsapp';
import { sendPaymentReminder as sendEmailReminder } from '@/lib/email';
import { generateId, parseSecondaryEmailsForCc } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all unpaid invoices
    const invoices = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.secondary_email as client_secondary_email, c.phone, c.whatsapp
       FROM invoices i
       INNER JOIN clients c ON i.client_id = c.id
       WHERE i.status != 'PAID' AND i.status != 'DRAFT'
       AND (i.next_reminder_date IS NULL OR i.next_reminder_date <= ?)
       ORDER BY i.due_date ASC`,
      [today]
    );

    let processed = 0;
    let sent = 0;
    let errors = 0;

    for (const invoice of invoices) {
      try {
        processed++;
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
        if (!dueDate) continue;

        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysBeforeDue = -daysDiff;
        const daysOverdue = daysDiff > 0 ? daysDiff : 0;

        let shouldSend = false;
        let reminderType = 'PAYMENT_REMINDER';

        // 7 days before due date - Alert
        if (daysBeforeDue === 7) {
          shouldSend = true;
          reminderType = 'ALERT';
        }
        // On due date - Invoice generated notification
        else if (daysBeforeDue === 0) {
          shouldSend = true;
          reminderType = 'INVOICE_GENERATED';
        }
        // After due date - Payment reminders
        else if (daysOverdue > 0) {
          if (daysOverdue <= 6 && daysOverdue % 2 === 0) {
            // Every 2 days until 6 days
            shouldSend = true;
          } else if (daysOverdue > 6 && daysOverdue <= 10) {
            // Every day after 6 days for 4 days
            shouldSend = true;
          } else if (daysOverdue > 10) {
            // Account cancellation warning
            shouldSend = true;
            reminderType = 'ACCOUNT_CANCELLATION';
          }
        }

        if (shouldSend) {
          const phone = invoice.whatsapp || invoice.phone;
          const email = invoice.client_email;

          // Send WhatsApp
          if (phone) {
            try {
              await sendWhatsAppReminder(
                phone,
                invoice.client_name,
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
            } catch (error) {
              console.error('WhatsApp send error:', error);
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
                  error instanceof Error ? error.message : 'Unknown error',
                ]
              );
            }
          }

          // Send Email
          if (email) {
            try {
              const cc = parseSecondaryEmailsForCc(invoice.client_secondary_email, email);
              await sendEmailReminder(
                email,
                invoice.client_name,
                invoice.invoice_number,
                parseFloat(invoice.total_amount),
                dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
                daysOverdue,
                undefined,
                undefined,
                cc.length > 0 ? cc : undefined
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
            } catch (error) {
              console.error('Email send error:', error);
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
                  error instanceof Error ? error.message : 'Unknown error',
                ]
              );
            }
          }

          // Update invoice reminder tracking
          const nextReminderDate = new Date(today);
          if (daysOverdue <= 6) {
            nextReminderDate.setDate(nextReminderDate.getDate() + 2);
          } else if (daysOverdue <= 10) {
            nextReminderDate.setDate(nextReminderDate.getDate() + 1);
          } else {
            nextReminderDate.setDate(nextReminderDate.getDate() + 7); // Weekly after 10 days
          }

          await query(
            `UPDATE invoices SET 
             last_reminder_sent_at = CURRENT_TIMESTAMP,
             reminder_count = COALESCE(reminder_count, 0) + 1,
             next_reminder_date = ?
             WHERE id = ?`,
            [nextReminderDate.toISOString().split('T')[0], invoice.id]
          );

          sent++;
        }
      } catch (error: any) {
        console.error('Process reminder error:', error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} invoices, sent ${sent} reminders, ${errors} errors`,
      data: {
        processed,
        sent,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Reminder process error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process reminders' },
      { status: 500 }
    );
  }
}

