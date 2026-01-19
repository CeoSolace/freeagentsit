// API route to create a new chat
import { NextResponse } from 'next/server';
const chatService = require('../../../../src/server/chat/chatService');

// Extract authenticated user information from headers.  In a real application
// this should be replaced with proper session handling.  We fall back to
// anonymous user if no header is provided which will result in a 401 from
// chatService.
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
    const others = Array.isArray(body.participants) ? body.participants : [];
    const convo = await chatService.createConversation(user.id, others);
    return NextResponse.json({ conversationId: convo.id }, { status: 201 });
  } catch (err) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}