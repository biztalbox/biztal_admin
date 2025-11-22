import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';

async function handleGet(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  try {
    let sql = 'SELECT * FROM employee_performance WHERE employee_id = ?';
    const sqlParams: any[] = [params.id];

    if (month && year) {
      sql += ' AND month = ? AND year = ?';
      sqlParams.push(parseInt(month), parseInt(year));
    }

    sql += ' ORDER BY year DESC, month DESC';

    const performances = await query(sql, sqlParams);
    return NextResponse.json({
      success: true,
      data: performances,
    });
  } catch (error: any) {
    console.error('Get performance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}

async function handlePost(
  req: NextRequest,
  userId: string,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const body = await req.json();
    const {
      month,
      year,
      attendance_score = 0,
      productivity_score = 0,
      learning_score = 0,
      communication_score = 0,
      teamwork_score = 0,
      initiative_score = 0,
      comments,
    } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Calculate overall score (weighted average)
    const weights = {
      attendance: 0.20,
      productivity: 0.25,
      learning: 0.15,
      communication: 0.15,
      teamwork: 0.15,
      initiative: 0.10,
    };

    const overallScore =
      parseFloat(attendance_score) * weights.attendance +
      parseFloat(productivity_score) * weights.productivity +
      parseFloat(learning_score) * weights.learning +
      parseFloat(communication_score) * weights.communication +
      parseFloat(teamwork_score) * weights.teamwork +
      parseFloat(initiative_score) * weights.initiative;

    // Check if performance record already exists
    const existing = await queryOne(
      'SELECT id FROM employee_performance WHERE employee_id = ? AND month = ? AND year = ?',
      [params.id, parseInt(month), parseInt(year)]
    );

    let id: string;
    if (existing) {
      id = existing.id;
      await execute(
        `UPDATE employee_performance SET
         attendance_score = ?, productivity_score = ?, learning_score = ?,
         communication_score = ?, teamwork_score = ?, initiative_score = ?,
         overall_score = ?, comments = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          parseFloat(attendance_score),
          parseFloat(productivity_score),
          parseFloat(learning_score),
          parseFloat(communication_score),
          parseFloat(teamwork_score),
          parseFloat(initiative_score),
          overallScore,
          comments || null,
          userId,
          id,
        ]
      );
    } else {
      id = generateId();
      await execute(
        `INSERT INTO employee_performance 
         (id, employee_id, month, year, attendance_score, productivity_score, learning_score,
          communication_score, teamwork_score, initiative_score, overall_score, comments, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          params.id,
          parseInt(month),
          parseInt(year),
          parseFloat(attendance_score),
          parseFloat(productivity_score),
          parseFloat(learning_score),
          parseFloat(communication_score),
          parseFloat(teamwork_score),
          parseFloat(initiative_score),
          overallScore,
          comments || null,
          userId,
        ]
      );
    }

    const performance = await queryOne('SELECT * FROM employee_performance WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Performance record saved successfully',
      data: performance,
    });
  } catch (error: any) {
    console.error('Save performance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save performance data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);

