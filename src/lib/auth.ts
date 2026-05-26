import bcrypt from 'bcryptjs'
import { db } from './db'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 8)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } })
}

export async function getUserByUsername(username: string) {
  return db.user.findUnique({ where: { username } })
}

export async function createUser(data: {
  username: string
  email: string
  password: string
  role?: string
}) {
  const passwordHash = await hashPassword(data.password)
  return db.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash,
      role: data.role || 'customer',
    },
  })
}

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email)
  if (!user || !user.passwordHash) return null
  if (user.banned) return null
  
  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) return null
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  }
}

export async function ensureAdminUser() {
  const adminEmail = 'admin@bloxvault.com'
  const existingAdmin = await getUserByEmail(adminEmail)
  
  if (!existingAdmin) {
    await createUser({
      username: 'BloxVault',
      email: adminEmail,
      password: 'Admin@2024',
      role: 'admin',
    })
  }
}
