-- proposals
CREATE TABLE public.proposals (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id     uuid          NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id  uuid          NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid          NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  title       text          NOT NULL,
  status      text          NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent', 'accepted', 'rejected')),
  notes       text          NULL,
  sent_at     timestamptz   NOT NULL DEFAULT now(),
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- proposal_items
CREATE TABLE public.proposal_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid          NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  service      text          NOT NULL,
  description  text          NULL,
  value        numeric(15,2) NOT NULL CHECK (value >= 0),
  position     int           NOT NULL DEFAULT 0
);

-- updated_at trigger (uses existing moddatetime extension)
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

-- Indexes
CREATE INDEX ON public.proposals (org_id, sent_at DESC);
CREATE INDEX ON public.proposals (deal_id);
CREATE INDEX ON public.proposal_items (proposal_id, position);

-- RLS
ALTER TABLE public.proposals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proposals" ON public.proposals
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_proposals" ON public.proposals
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_proposals" ON public.proposals
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_proposals" ON public.proposals
  FOR DELETE USING (public.is_org_member(org_id));

-- proposal_items: access via parent proposal's org_id
CREATE POLICY "select_proposal_items" ON public.proposal_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id AND public.is_org_member(p.org_id))
  );
CREATE POLICY "insert_proposal_items" ON public.proposal_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id AND public.is_org_member(p.org_id))
  );
CREATE POLICY "delete_proposal_items" ON public.proposal_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id AND public.is_org_member(p.org_id))
  );
CREATE POLICY "update_proposal_items" ON public.proposal_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id AND public.is_org_member(p.org_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id AND public.is_org_member(p.org_id))
  );
