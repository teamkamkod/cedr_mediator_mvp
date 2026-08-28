-- =============================================================
-- CEDR Mediator Portal — Dev Seed Data
-- Run this in Supabase SQL editor to create test users
-- Passwords are set to: Mediator1!
-- =============================================================

-- Test mediator: team+mediator1@kamkod.com
-- Auth user
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '80607c86-7cc2-4991-96fe-ebee5b30c15f',
  '00000000-0000-0000-0000-000000000000',
  'team+mediator1@kamkod.com',
  crypt('Mediator1!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  false, '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Public profile
INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
VALUES (
  '80607c86-7cc2-4991-96fe-ebee5b30c15f',
  'team+mediator1@kamkod.com',
  'Mediator', 'One', 'mediator', true
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- To add a super_admin, replace values below and run:
-- =============================================================
-- INSERT INTO auth.users (id, instance_id, email, encrypted_password,
--   email_confirmed_at, role, aud, created_at, updated_at,
--   raw_app_meta_data, raw_user_meta_data, is_super_admin,
--   confirmation_token, recovery_token, email_change_token_new, email_change)
-- VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
--   'admin@example.com', crypt('YourPassword!', gen_salt('bf')),
--   now(), 'authenticated', 'authenticated', now(), now(),
--   '{"provider":"email","providers":["email"]}', '{}',
--   false, '', '', '', '')
-- RETURNING id;
--
-- Then insert into public.users with role = 'super_admin'
