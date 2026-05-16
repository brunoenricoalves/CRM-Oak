-- Helper: verifica se o usuário é admin da org
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Helper: verifica se o usuário é membro da org
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Criação de organização no signup
CREATE OR REPLACE FUNCTION public.create_org_and_admin(
  p_name    text,
  p_slug    text,
  p_user_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_base_slug text := p_slug;
  v_counter int := 0;
BEGIN
  LOOP
    BEGIN
      INSERT INTO public.organizations (name, slug)
      VALUES (p_name, v_base_slug)
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      v_base_slug := p_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    END;
  END LOOP;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin');

  RETURN v_org_id;
END;
$$;

-- Criação de convite
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_org_id    uuid,
  p_email     text,
  p_role      text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Apenas administradores podem convidar membros';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.invitations (org_id, email, token, role, invited_by)
  VALUES (p_org_id, lower(p_email), v_token, p_role, auth.uid());

  RETURN v_token;
END;
$$;

-- Aceite de convite
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_inv public.invitations;
BEGIN
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_inv.org_id, auth.uid(), v_inv.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.org_id;
END;
$$;

-- Lookup público de convite por token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id         uuid,
  org_id     uuid,
  org_name   text,
  email      text,
  role       text,
  expires_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT i.id, i.org_id, o.name AS org_name, i.email, i.role, i.expires_at
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = p_token
    AND i.accepted_at IS NULL
    AND i.expires_at > now();
$$;
