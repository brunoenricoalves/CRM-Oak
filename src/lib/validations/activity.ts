import { z } from 'zod'

export const activitySchema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting']),
  body: z.string().min(1, 'Conteúdo obrigatório'),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  deal_id: z.string().uuid().optional().or(z.literal('')),
})

export type ActivityInput = z.infer<typeof activitySchema>
