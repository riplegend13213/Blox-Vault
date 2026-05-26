import { NextResponse } from 'next/server'
import path from 'path'
import { stat, readFile } from 'fs/promises'

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join('/tmp', 'uploads')

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ success: false, error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = path.join(UPLOADS_DIR, filename)
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
    }

    const data = await readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }[ext] || 'application/octet-stream'

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Upload file serve error:', error)
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
  }
}
