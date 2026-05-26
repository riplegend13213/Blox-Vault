export function zodFirstError(err: any) {
  if (!err) return 'Invalid input'
  // Zod v3 uses `issues`, older patterns might use `errors`.
  const msg = err?.issues?.[0]?.message ?? err?.errors?.[0]?.message
  if (msg) return String(msg)
  // Sometimes ZodError message is on `message`
  if (typeof err.message === 'string') return err.message
  return 'Invalid input'
}
