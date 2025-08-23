import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const { message, data } = await request.json();
    console.log(`[DEBUG LOG] Message: ${message}, Data:`, data);
    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
  } catch (error: any) {
    console.error('Failed to process debug log request:', error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), { status: 500 });
  }
}