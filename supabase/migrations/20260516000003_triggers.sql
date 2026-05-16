-- Protege contra remoção do último admin
CREATE OR REPLACE FUNCTION public.ensure_org_has_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'admin') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin') THEN
    IF (SELECT COUNT(*) FROM public.org_members
        WHERE org_id = OLD.org_id AND role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'A organização precisa de pelo menos um administrador';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER protect_last_admin
  BEFORE UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.ensure_org_has_admin();

-- Valida que owner_id / assigned_to pertence à mesma org
CREATE OR REPLACE FUNCTION public.validate_owner_org_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('contacts', 'deals') THEN
    v_user_id := NEW.owner_id;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_user_id := NEW.assigned_to;
  END IF;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = NEW.org_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'O usuário % não é membro da organização %', v_user_id, NEW.org_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contacts_owner
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

CREATE TRIGGER validate_deals_owner
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

CREATE TRIGGER validate_tasks_assigned_to
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

-- Preenche closed_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_deal_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    NEW.closed_at := now();
  ELSIF NEW.status = 'open' AND OLD.status != 'open' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_status_change
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_status_change();
