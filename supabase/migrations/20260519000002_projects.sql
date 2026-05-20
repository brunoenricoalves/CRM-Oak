CREATE TABLE public.projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id     uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id  uuid        NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'closed')),
  monday_url  text        NULL,
  start_date  date        NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_deal_id_key UNIQUE (deal_id)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

CREATE INDEX ON public.projects (org_id, status, created_at DESC);
CREATE INDEX ON public.projects (deal_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_projects" ON public.projects
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_projects" ON public.projects
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_projects" ON public.projects
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_projects" ON public.projects
  FOR DELETE USING (public.is_org_member(org_id));
