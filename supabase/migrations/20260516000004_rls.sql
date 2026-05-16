-- Habilitar RLS em todas as tabelas
ALTER TABLE public.organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY "select_own_orgs" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_update_org" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

-- org_members
CREATE POLICY "select_own_memberships" ON public.org_members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_select_org_members" ON public.org_members
  FOR SELECT USING (public.is_org_admin(org_id));
CREATE POLICY "admin_insert_members" ON public.org_members
  FOR INSERT WITH CHECK (public.is_org_admin(org_members.org_id));
CREATE POLICY "admin_update_members" ON public.org_members
  FOR UPDATE USING (public.is_org_admin(org_members.org_id))
             WITH CHECK (public.is_org_admin(org_members.org_id));
CREATE POLICY "admin_delete_members" ON public.org_members
  FOR DELETE USING (public.is_org_admin(org_members.org_id));

-- invitations
CREATE POLICY "admin_select_invitations" ON public.invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_insert_invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_delete_invitations" ON public.invitations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );

-- contacts
CREATE POLICY "select_contacts" ON public.contacts
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_contacts" ON public.contacts
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_contacts" ON public.contacts
  FOR DELETE USING (public.is_org_member(org_id));

-- companies
CREATE POLICY "select_companies" ON public.companies
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_companies" ON public.companies
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_companies" ON public.companies
  FOR DELETE USING (public.is_org_member(org_id));

-- pipeline_stages
CREATE POLICY "select_stages" ON public.pipeline_stages
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "admin_insert_stages" ON public.pipeline_stages
  FOR INSERT WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "admin_update_stages" ON public.pipeline_stages
  FOR UPDATE USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "admin_delete_stages" ON public.pipeline_stages
  FOR DELETE USING (public.is_org_admin(org_id));

-- deals
CREATE POLICY "select_deals" ON public.deals
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_deals" ON public.deals
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_deals" ON public.deals
  FOR DELETE USING (public.is_org_member(org_id));

-- activities (append-only)
CREATE POLICY "select_activities" ON public.activities
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_activities" ON public.activities
  FOR INSERT WITH CHECK (public.is_org_member(org_id));

-- tasks
CREATE POLICY "select_tasks" ON public.tasks
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_tasks" ON public.tasks
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_tasks" ON public.tasks
  FOR DELETE USING (public.is_org_member(org_id));
