import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
  try {
    const mailOptions: any = {
      from: `"${process.env.SMTP_FROM_NAME || 'Accounts Team'}" <${process.env.SMTP_FROM_EMAIL || 'accounts@biztalbox.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    if (options.cc) {
      mailOptions.cc = options.cc;
    }

    if (options.replyTo) {
      mailOptions.replyTo = options.replyTo;
    }

    if (options.inReplyTo) {
      mailOptions.inReplyTo = options.inReplyTo;
    }

    if (options.references) {
      mailOptions.references = options.references;
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export function getWelcomeEmailTemplate(clientName: string, appName: string = 'Admin Panel'): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to ${appName}!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Dear ${clientName},</p>
        <p>Your account has been successfully created. We're excited to have you on board!</p>
        <p>Our team is here to support you every step of the way.</p>
        <p>If you have any questions, feel free to reach out to us.</p>
        <p style="margin-top: 30px;">Best regards,<br>${appName} Team</p>
      </div>
    </body>
    </html>
  `;
}

export function getPaymentReminderTemplate(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  daysOverdue?: number
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Payment Reminder</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder that your invoice <strong>#${invoiceNumber}</strong> is pending payment.</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Details:</strong></p>
          <p>Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p>Due Date: ${dueDate}</p>
          ${daysOverdue ? `<p style="color: #dc2626;">Days Overdue: ${daysOverdue}</p>` : ''}
        </div>
        <p>Please make the payment at your earliest convenience.</p>
        <p style="margin-top: 30px;">Thank you!<br>Accounts Team<br> <a href="https://biztalbox.com">biztalbox.com</a></p>
      </div>
    </body>
    </html>
  `;
}

export function getInvoiceEmailTemplate(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate?: string
): string {
  const dueDateText = dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Invoice #${invoiceNumber}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Dear ${clientName},</p>
        <p>Attaching the invoice for your reference. We would appreciate your support in clearing the payment within the due timeline.</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Details:</strong></p>
          <p><strong>Invoice Number:</strong> #${invoiceNumber}</p>
          <p><strong>Total Amount:</strong> ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          ${dueDateText}
        </div>
        <p>Thank you and looking forward to continuing our collaboration.</p>
        <p style="margin-top: 30px;">Best regards,<br>${process.env.SMTP_FROM_NAME || 'Accounts Team'}<br><a href="https://biztalbox.com">biztalbox.com</a></p>
      </div>
    </body>
    </html>
  `;
}

export async function sendWelcomeEmail(to: string, clientName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const html = getWelcomeEmailTemplate(clientName, process.env.APP_NAME || 'Biztalbox');
  return sendEmail({
    to,
    subject: `Welcome to ${process.env.APP_NAME || 'Admin Panel'}!`,
    html,
  });
}

export async function sendPaymentReminder(
  to: string,
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  daysOverdue?: number,
  inReplyTo?: string,
  references?: string,
  cc?: string | string[]
): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
  const html = getPaymentReminderTemplate(clientName, invoiceNumber, amount, dueDate, daysOverdue);
  return sendEmail({
    to,
    subject: `Payment Reminder - Invoice #${invoiceNumber}`,
    html,
    inReplyTo,
    references,
    cc,
  });
}

export async function sendInvoiceEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate?: string,
  pdfBuffer?: Buffer,
  cc?: string | string[]
): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
  const html = getInvoiceEmailTemplate(clientName, invoiceNumber, amount, dueDate);
  const attachments = pdfBuffer ? [{
    filename: `Invoice_${invoiceNumber}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }] : undefined;

  return sendEmail({
    to,
    subject: `Invoice #${invoiceNumber} - ${process.env.SMTP_FROM_NAME || 'BIZTALBOX MARKETING & BUSINESS CONSULTING PVT. LTD.'}`,
    html,
    attachments,
    cc,
  });
}
