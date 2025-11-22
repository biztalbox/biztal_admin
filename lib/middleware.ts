import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export function withAuth(
  handler: (req: NextRequest, userId: string, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    // In Next.js 14, context might be passed as second parameter
    const actualContext = context || {};
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                   req.cookies.get('token')?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }

      return handler(req, payload.userId, context);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

