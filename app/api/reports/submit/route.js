// API route to submit a chat report
import { NextResponse } from 'next/server';
const reportService = require('../../../../src/server/reports/reportService');

function getAuth(request) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  return { id: userId, isStaff: role === 'staff' };
}

export async function POST(request) {
  try {
    const user = getAuth(request);
    if (!user.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const { conversationId, reason } = body || {};
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }
    const report = await reportService.submitReport(conversationId, user.id, reason || '');
    return NextResponse.json({ reportId: report.id }, { status: 201 });
  } catch (err) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}