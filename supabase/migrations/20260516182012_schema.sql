-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Organizations
CREATE TABLE public.organizations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  plan       text        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Org Members
CREATE TABLE public.org_members (
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('admin', 'member')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Invitations
CREATE TABLE public.invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  token       text        NOT NULL UNIQUE,
  role        text        NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by  uuid        NOT NULL REFERENCES auth.users(id),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Companies
CREATE TABLE public.companies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  domain      text        NULL,
  industry    text        NULL,
  size        text        NULL CHECK (
    size IS NULL OR size IN ('1-10', '11-50', '51-200', '200+')
  ),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Contacts
CREATE TABLE public.contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text        NULL,
  phone       text        NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id    uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Pipeline Stages
CREATE TABLE public.pipeline_stages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  position    float8      NOT NULL,
  color       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE public.deals (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title       text          NOT NULL,
  value       numeric(15,2) NULL,
  stage_id    uuid          NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  contact_id  uuid          NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid          NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id    uuid          NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status      text          NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'won', 'lost')),
  closed_at   timestamptz   NULL,
  close_date  date          NULL,
  position    float8        NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- Activities
CREATE TABLE public.activities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('call', 'email', 'note', 'meeting')),
  body        text        NULL,
  contact_id  uuid        NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id     uuid        NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_has_target
    CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL OR company_id IS NOT NULL)
);

-- Tasks
CREATE TABLE public.tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  due_date    timestamptz NULL,
  done        boolean     NOT NULL DEFAULT false,
  assigned_to uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  contact_id  uuid        NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id     uuid        NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers (moddatetime)
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

-- Performance indexes
CREATE INDEX ON public.contacts        (org_id);
CREATE INDEX ON public.companies       (org_id);
CREATE INDEX ON public.deals           (org_id, status);
CREATE INDEX ON public.deals           (org_id, stage_id, position);
CREATE INDEX ON public.activities      (org_id, created_at DESC);
CREATE INDEX ON public.tasks           (org_id, done, due_date);
CREATE INDEX ON public.pipeline_stages (org_id, position);
CREATE INDEX ON public.org_members     (user_id);
CREATE INDEX ON public.invitations     (org_id);
CREATE UNIQUE INDEX ON public.invitations (org_id, email) WHERE accepted_at IS NULL;

-- pg_trgm indexes for search
CREATE INDEX contacts_name_trgm  ON public.contacts  USING GIN (name  gin_trgm_ops);
CREATE INDEX contacts_email_trgm ON public.contacts  USING GIN (email gin_trgm_ops);
CREATE INDEX companies_name_trgm ON public.companies USING GIN (name  gin_trgm_ops);
