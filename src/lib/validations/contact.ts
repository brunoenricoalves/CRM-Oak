import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company_id: z.string().uuid('Empresa inválida').optional().or(z.literal('')),
  owner_id: z.string().uuid().optional().or(z.literal('')),
})

export type ContactInput = z.infer<typeof contactSchema>
