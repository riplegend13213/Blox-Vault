# Supabase Upload Setup

This app can upload files to Supabase Storage from the server-side upload route.

## Required environment variables

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-side key for storage uploads
- `SUPABASE_ANON_KEY` — public key for URL generation (optional if bucket is public)
- `SUPABASE_BUCKET` — storage bucket name (defaults to `uploads`)

## How it works

- `src/app/api/admin/upload/route.ts` uploads files to Supabase Storage when Supabase is configured.
- If Supabase is not configured, the app falls back to local `/tmp/uploads` storage for temporary uploads.
- Uploaded files return a URL from Supabase Storage.

## Recommended bucket settings

- Create a public bucket for images
- Use the service role key only on the server
- Set the bucket to public if you want direct public access to uploaded URLs
