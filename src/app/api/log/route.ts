import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Client-side log:', data);
    return NextResponse.json({ message: 'Log received' }, { status: 200 });
  } catch (error) {
    console.error('Error receiving log:', error);
    return NextResponse.json({ error: 'Failed to receive log' }, { status: 500 });
  }
}