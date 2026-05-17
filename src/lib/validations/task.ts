import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres'),
  due_date: z.string().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  deal_id: z.string().uuid().optional().or(z.literal('')),
})

export type TaskInput = z.infer<typeof taskSchema>
