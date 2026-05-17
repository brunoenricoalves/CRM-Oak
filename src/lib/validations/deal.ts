import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres'),
  value: z.coerce.number().min(0).optional(),
  stage_id: z.string().uuid('Etapa inválida').optional().or(z.literal('')),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  close_date: z.string().optional().or(z.literal('')),
})

export type DealInput = z.infer<typeof dealSchema>
