import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne, execute } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';

async function handlePut(req: NextRequest, userId: string) {
  try {
    const body = await req.json();
    const { name, email, phone, currentPassword, newPassword } = body;

    // Get current user
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // If password is being changed, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update with password
      await execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || user.name, email || user.email, phone || null, hashedPassword, userId]
      );
    } else {
      // Update without password
      await execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || user.name, email || user.email, phone || null, userId]
      );
    }

    // Get updated user
    const updatedUser = await queryOne('SELECT id, name, email, role, image, phone FROM users WHERE id = ?', [userId]);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(handlePut);

