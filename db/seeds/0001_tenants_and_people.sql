-- Reference workspaces and their people.

INSERT INTO tenants (id, slug, name, plan, seats_purchased, branding, settings) VALUES
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'northwind', 'Northwind Trading Co.', 'enterprise', 500,
   '{"primaryColor":"#4f46e5","logoUrl":"/uploads/brand/northwind.png","accent":"indigo"}'::jsonb,
   '{"allowSelfEnrollment":true,"certificateExpiryMonths":24,"defaultLocale":"en-US"}'::jsonb),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'helios', 'Helios Robotics', 'growth', 120,
   '{"primaryColor":"#0891b2","logoUrl":"/uploads/brand/helios.png","accent":"cyan"}'::jsonb,
   '{"allowSelfEnrollment":false,"certificateExpiryMonths":12,"defaultLocale":"en-GB"}'::jsonb),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0003', 'acme-internal', 'Acme Corporation', 'internal', 5000,
   '{"primaryColor":"#dc2626","logoUrl":"/uploads/brand/acme.png","accent":"red"}'::jsonb,
   '{"allowSelfEnrollment":true,"certificateExpiryMonths":36,"defaultLocale":"en-US"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, display_name, title, bio, role, status, credits, mfa_enabled, mfa_secret, mfa_backup_codes, preferences, password_changed_at) VALUES
  -- Northwind
  ('a1000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'dana.whitfield@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Dana Whitfield', 'VP, People Operations', 'Leads the learning and development function at Northwind.',
   'owner', 'active', 5000, true, 'JBSWY3DPEHPK3PXP', '["A91C4F2E7B03","5D8E1A6C9F42","B7204E8D1A36"]'::jsonb,
   '{"theme":"system","digestFrequency":"weekly","notifications":{"email":true,"inApp":true}}'::jsonb, now() - interval '90 days'),
  ('a1000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'marcus.reed@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Marcus Reed', 'Director of Enablement', 'Runs onboarding programmes for commercial teams.',
   'admin', 'active', 1200, false, NULL, '[]'::jsonb,
   '{"theme":"dark","digestFrequency":"daily"}'::jsonb, now() - interval '120 days'),
  ('a1000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'priya.nair@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Priya Nair', 'Learning Programme Manager', 'Manages compliance and certification tracks.',
   'manager', 'active', 800, false, NULL, '[]'::jsonb,
   '{"theme":"light"}'::jsonb, now() - interval '60 days'),
  ('a1000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'oliver.grant@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Oliver Grant', 'Principal Instructor', 'Twelve years building technical curricula.',
   'instructor', 'active', 300, false, NULL, '[]'::jsonb,
   '{"theme":"light","editorMode":"markdown"}'::jsonb, now() - interval '200 days'),
  ('a1000000-0000-4000-8000-000000000005', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'sofia.almeida@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Sofia Almeida', 'Instructor, Data Practice', 'Analytics and reporting specialist.',
   'instructor', 'active', 250, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '150 days'),
  ('a1000000-0000-4000-8000-000000000006', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'jordan.blake@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Jordan Blake', 'Account Executive', 'Enterprise sales, EMEA.',
   'learner', 'active', 120, false, NULL, '[]'::jsonb,
   '{"theme":"system","autoplayVideo":false}'::jsonb, now() - interval '30 days'),
  ('a1000000-0000-4000-8000-000000000007', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'chen.wei@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Chen Wei', 'Solutions Engineer', 'Pre-sales engineering, APAC.',
   'learner', 'active', 340, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '25 days'),
  ('a1000000-0000-4000-8000-000000000008', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'amara.osei@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Amara Osei', 'Customer Success Manager', 'Renewals and adoption.',
   'learner', 'active', 90, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '18 days'),
  ('a1000000-0000-4000-8000-000000000009', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'liam.torres@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Liam Torres', 'Support Engineer', 'Tier 2 support.',
   'learner', 'active', 60, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '12 days'),
  ('a1000000-0000-4000-8000-00000000000a', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001',
   'nina.kowalski@northwind.example', '$2a$10$fI03NqcnHBQs8LZUGZa0ye2pVcBg8e18PCgIXk1RKVpQurnkZogQu',
   'Nina Kowalski', 'Contract Analyst', 'Joined through the Q3 roster import.',
   'learner', 'invited', 0, false, NULL, '[]'::jsonb, '{}'::jsonb, NULL),

  -- Helios
  ('b2000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002',
   'ingrid.haas@helios.example', '$2a$10$rEM9xAe./ITdceFs4wvdf.w0NonZ7UU3ppoP2DYtooBm9UlRUO1SG',
   'Ingrid Haas', 'Head of Engineering Learning', 'Owns the Helios technical academy.',
   'owner', 'active', 2400, true, 'KRSXG5CTMVRXEZLU', '["C31F9A7E4D28","82B6E0C5F193"]'::jsonb,
   '{"theme":"dark"}'::jsonb, now() - interval '75 days'),
  ('b2000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002',
   'tomas.varga@helios.example', '$2a$10$rEM9xAe./ITdceFs4wvdf.w0NonZ7UU3ppoP2DYtooBm9UlRUO1SG',
   'Tomas Varga', 'Robotics Instructor', 'Motion planning and controls.',
   'instructor', 'active', 400, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '95 days'),
  ('b2000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002',
   'yuki.tanaka@helios.example', '$2a$10$rEM9xAe./ITdceFs4wvdf.w0NonZ7UU3ppoP2DYtooBm9UlRUO1SG',
   'Yuki Tanaka', 'Firmware Engineer', 'Embedded systems team.',
   'learner', 'active', 180, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '40 days'),
  ('b2000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002',
   'rafael.costa@helios.example', '$2a$10$rEM9xAe./ITdceFs4wvdf.w0NonZ7UU3ppoP2DYtooBm9UlRUO1SG',
   'Rafael Costa', 'Mechatronics Lead', 'Hardware/software integration.',
   'manager', 'active', 620, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '55 days'),

  -- Acme internal
  ('c3000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0003',
   'platform-ops@acme.example', '$2a$10$YDKDkpq83K3WENUCeyamc.4zLlnaFrch8Hecy5u2iWG7Ip8EAP6US',
   'Platform Operations', 'Service Account', 'Automation principal for platform tooling.',
   'owner', 'active', 0, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '400 days'),
  ('c3000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0003',
   'harriet.doyle@acme.example', '$2a$10$YDKDkpq83K3WENUCeyamc.4zLlnaFrch8Hecy5u2iWG7Ip8EAP6US',
   'Harriet Doyle', 'Curriculum Architect', 'Designs the shared Acme catalogue.',
   'admin', 'active', 900, false, NULL, '[]'::jsonb, '{}'::jsonb, now() - interval '180 days')
ON CONFLICT (id) DO NOTHING;

UPDATE users
   SET profile_encrypted = encode(
         convert_to('{"employeeId":"NW-' || substr(id::text, 1, 6) || '","department":"General"}', 'UTF8'),
         'base64')
 WHERE profile_encrypted IS NULL;
