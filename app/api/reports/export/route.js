// API route to export a conversation to HTML
import { NextResponse } from 'next/server';
const chatService = require('../../../../src/server/chat/chatService');
const { buildConversationHtml } = require('../../../../src/server/reports/exportHtml');

function getAuth(request) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  return { id: userId, isStaff: role === 'staff' };
}

export async function GET(request) {
  try {
    const user = getAuth(request);
    if (!user.id) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return new NextResponse(JSON.stringify({ error: 'conversationId query param required' }), { status: 400 });
    }
    // Ensure user is part of conversation (throws if not)
    const convo = await chatService.joinConversation(conversationId, user.id);
    const messages = await chatService.getMessages(conversationId);
    const html = buildConversationHtml(convo, messages, [], {});
    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="conversation-${conversationId}.html"`,
      },
    });
    return response;
  } catch (err) {
    const status = err.statusCode || 500;
    return new NextResponse(JSON.stringify({ error: err.message || 'Internal server error' }), { status });
  }
}