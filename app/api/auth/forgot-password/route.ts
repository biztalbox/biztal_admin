import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { storeVerificationCode } from '@/lib/verification-codes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code
    storeVerificationCode(email, code, 15);

    // Send verification code via email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Verification</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Use the verification code below to proceed:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #667eea;">
            <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 12px;">This code will expire in 15 minutes.</p>
          <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          <p style="margin-top: 30px;">Best regards,<br>${process.env.APP_NAME || 'Admin Panel'} Team</p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Password Reset Verification Code',
      html: emailHtml,
      text: `Your password reset verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
    });

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    } else {
      return NextResponse.json(
        { success: false, error: emailResult.error || 'Failed to send verification code' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

