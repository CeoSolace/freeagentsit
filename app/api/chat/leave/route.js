// API route to leave a chat
import { NextResponse } from 'next/server';
const chatService = require('../../../../src/server/chat/chatService');

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
    const { conversationId } = body || {};
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }
    await chatService.leaveConversation(conversationId, user.id);
    return NextResponse.json({}, { status: 204 });
  } catch (err) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}