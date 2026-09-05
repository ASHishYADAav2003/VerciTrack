import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

function getUsers(): any[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export async function GET() {
  const cookieStore = await cookies()                    // ← await required in Next.js 15
  const role = cookieStore.get('user_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const safe = getUsers().map(({ password, ...rest }: any) => rest)
  return NextResponse.json({ users: safe })
}
