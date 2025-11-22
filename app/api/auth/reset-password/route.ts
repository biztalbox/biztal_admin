import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { verifyCode, deleteVerificationCode } from '@/lib/verification-codes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, verificationCode, newPassword } = body;

    if (!email || !verificationCode || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, verification code, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or verification code' },
        { status: 400 }
      );
    }

    // Verify code
    const isValid = verifyCode(email, verificationCode);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code. Please request a new code.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Remove used verification code
    deleteVerificationCode(email);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}

