import { z } from 'zod'

export const PROPOSAL_SERVICES = [
  'Mídia Paga',
  'CRM',
  'SEO',
  'Redes Sociais',
  'Outro',
] as const

export const proposalItemSchema = z.object({
  service: z.string().min(1, 'Serviço obrigatório'),
  description: z.string().optional(),
  value: z.coerce.number().min(0, 'Valor deve ser positivo'),
  position: z.coerce.number().default(0),
})

export const proposalSchema = z.object({
  deal_id: z.string().uuid('Negócio inválido'),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(1, 'Título obrigatório'),
  notes: z.string().optional(),
  items: z.array(proposalItemSchema).min(1, 'Adicione ao menos um serviço'),
})

export type ProposalInput = z.infer<typeof proposalSchema>
