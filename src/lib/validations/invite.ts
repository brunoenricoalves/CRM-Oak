import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'member']),
})

export type InviteInput = z.infer<typeof inviteSchema>
