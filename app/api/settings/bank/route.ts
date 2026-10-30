import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { isBankConfigured } from '@/lib/company-bank';
import { getCompanyBank, saveCompanyBank } from '@/lib/company-bank-db';

async function handleGet() {
  try {
    const data = await getCompanyBank();
    return NextResponse.json({
      success: true,
      data,
      configured: isBankConfigured(data),
    });
  } catch (error: any) {
    console.error('Get company bank error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load bank details' },
      { status: 500 }
    );
  }
}

async function handlePut(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await saveCompanyBank(body);
    return NextResponse.json({
      success: true,
      message: 'Bank details saved',
      data,
      configured: true,
    });
  } catch (error: any) {
    console.error('Save company bank error:', error);
    const status = error.status === 400 ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save bank details' },
      { status }
    );
  }
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
