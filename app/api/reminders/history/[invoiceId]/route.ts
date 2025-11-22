import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query } from '@/lib/db';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const params = await context.params;
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel'); // 'WHATSAPP', 'EMAIL', or null for all

    let sql = 'SELECT * FROM reminder_history WHERE invoice_id = ?';
    const sqlParams: any[] = [params.invoiceId];

    if (channel) {
      sql += ' AND channel = ?';
      sqlParams.push(channel);
    }

    sql += ' ORDER BY created_at DESC';

    const history = await query(sql, sqlParams);
    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Get reminder history error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reminder history' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);

