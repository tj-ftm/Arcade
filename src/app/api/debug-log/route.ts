import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received debug log:', data);
    return NextResponse.json({ message: 'Log received' }, { status: 200 });
  } catch (error) {
    console.error('Error receiving or writing debug log:', error);
    return NextResponse.json({ error: 'Failed to receive or write debug log' }, { status: 500 });
  }
}