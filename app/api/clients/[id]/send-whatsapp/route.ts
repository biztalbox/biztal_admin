import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { queryOne } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';

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

    const phone = client.whatsapp || client.phone;
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Client WhatsApp/Phone number not available' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const result = await sendWhatsApp(phone, message);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp message sent successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Send WhatsApp error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);

