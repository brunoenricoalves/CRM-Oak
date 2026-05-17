import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  domain: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
})

export type CompanyInput = z.infer<typeof companySchema>
