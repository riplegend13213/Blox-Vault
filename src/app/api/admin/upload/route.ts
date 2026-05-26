import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { supabase, supabaseBucket, getSupabasePublicUrl, isSupabaseEnabled } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function requireAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('bv_session')
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.value },
    select: { id: true, role: true, banned: true },
  })

  if (!user || user.banned || user.role !== 'admin') return null
  return user
}

export async function POST(request: Request) {
  try {
    // Check admin access
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp' },
        { status: 400 }
      )
    }

    // Validate extension
    const originalName = file.name.toLowerCase()
    const ext = path.extname(originalName)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file extension. Allowed: .jpg, .jpeg, .png, .gif, .webp' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uniquePrefix = Date.now() + '-' + Math.random().toString(36).slice(2)
    const filename = uniquePrefix + ext

    let publicUrl: string

    if (isSupabaseEnabled && supabase) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from(supabaseBucket)
        .upload(filename, buffer, { contentType: file.type })

      if (uploadError) {
        console.error('Supabase upload failed:', uploadError)
        return NextResponse.json(
          { success: false, error: 'Failed to upload file to Supabase' },
          { status: 500 }
        )
      }

      publicUrl = getSupabasePublicUrl(filename)
    } else {
      // Use a writable directory in deployment environments like Render/Vercel
      const uploadsDir = process.env.UPLOADS_DIR || path.join('/tmp', 'uploads')
      await mkdir(uploadsDir, { recursive: true })

      // Save file locally
      const filePath = path.join(uploadsDir, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      publicUrl = `/api/uploads/${filename}`
    }

    return NextResponse.json({
      success: true,
      data: { url: publicUrl },
    })
  } catch (error) {
    console.error('Admin upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
