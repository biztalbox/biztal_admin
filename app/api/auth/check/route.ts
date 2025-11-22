import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 cookies().get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, authenticated: false, error: error.message },
      { status: 401 }
    );
  }
}

