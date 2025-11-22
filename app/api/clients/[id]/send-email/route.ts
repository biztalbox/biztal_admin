import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';

async function handlePost(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [params.id]);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    if (!client.email) {
      return NextResponse.json(
        { success: false, error: 'Client email not available' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Convert message to HTML (preserve line breaks)
    const htmlMessage = message.replace(/\n/g, '<br>');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">${subject}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Dear ${client.name},</p>
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${htmlMessage}
          </div>
          <p style="margin-top: 30px;">Best regards,<br>${process.env.SMTP_FROM_NAME || 'Accounts Team'}</p>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: client.email,
      subject,
      html,
      text: message,
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);

