-- Commerce, credentialing, and platform service configuration.

INSERT INTO coupons (id, tenant_id, code, kind, value, credit_grant, max_redemptions,
                     redemption_count, per_user_limit, expires_at, active) VALUES
  ('61000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'WELCOME25', 'percent', 25, 0, 1000, 187, 1, now() + interval '180 days', true),
  ('61000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'Q3KICKOFF', 'percent', 40, 50, 200, 96, 1, now() + interval '60 days', true),
  ('61000000-0000-4000-8000-000000000003', NULL, 'PARTNER100', 'fixed', 10000, 100, 50, 12, 1, now() + interval '365 days', true),
  ('61000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'HELIOSLAB', 'percent', 15, 25, NULL, 33, 2, NULL, true),
  ('61000000-0000-4000-8000-000000000005', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'SPRING23', 'percent', 30, 0, 500, 500, 1, now() - interval '200 days', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_methods (id, user_id, brand, last4, exp_month, exp_year, provider_token, billing_zip, is_default) VALUES
  ('71000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'visa', '4242', 11, 2027, 'pm_live_51NxQeRTuVwXyZaBcD3fGhIjK', 'EC1A 1BB', true),
  ('71000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 'mastercard', '8210', 4, 2026, 'pm_live_51MpLdQSrTuVwXyZaBcD9eFgHi', 'SW1A 2AA', true),
  ('71000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000007', 'amex', '0031', 9, 2028, 'pm_live_51PqRsTuVwXyZaBcDeFgHiJkLm', '94105', true),
  ('71000000-0000-4000-8000-000000000004', 'b2000000-0000-4000-8000-000000000001', 'visa', '1195', 2, 2029, 'pm_live_51QrStUvWxYzAbCdEfGhIjKlMn', '80331', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, tenant_id, user_id, course_id, coupon_id, quantity, subtotal_cents,
                    discount_cents, total_cents, status, provider_ref, created_at) VALUES
  ('81000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', 'e5000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001', 1, 49900, 12475, 37425, 'paid', 'ch_3PqRsTuVwXyZ', now() - interval '35 days'),
  ('81000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', 'e5000000-0000-4000-8000-000000000003', NULL, 1, 49900, 0, 49900, 'paid', 'ch_3QrStUvWxYzA', now() - interval '8 days'),
  ('81000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000002', 1, 79900, 31960, 47940, 'paid', 'ch_3RsTuVwXyZaB', now() - interval '50 days'),
  ('81000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000004', 1, 129900, 19485, 110415, 'paid', 'ch_3StUvWxYzAbC', now() - interval '45 days'),
  ('81000000-0000-4000-8000-000000000005', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000006', NULL, 1, 129900, 0, 129900, 'paid', 'ch_3TuVwXyZaBcD', now() - interval '60 days'),
  ('81000000-0000-4000-8000-000000000006', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000008', 'e5000000-0000-4000-8000-000000000004', NULL, 1, 79900, 0, 79900, 'pending', NULL, now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit_ledger (tenant_id, user_id, delta, balance_after, reason, reference, created_at) VALUES
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', 200, 200, 'grant.onboarding', 'welcome-pack', now() - interval '30 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', -80, 120, 'course.purchase', 'NW-DATA-310', now() - interval '8 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', 300, 300, 'grant.onboarding', 'welcome-pack', now() - interval '55 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', 50, 350, 'coupon.redeemed', 'Q3KICKOFF', now() - interval '35 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', -10, 340, 'course.purchase', 'NW-LEAD-400', now() - interval '20 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000008', 90, 90, 'grant.onboarding', 'welcome-pack', now() - interval '18 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000003', 180, 180, 'grant.onboarding', 'welcome-pack', now() - interval '40 days');

INSERT INTO invoices (id, tenant_id, number, period_start, period_end, amount_cents, status) VALUES
  ('91000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'NW-2025-0007', date_trunc('month', now() - interval '3 months')::date, (date_trunc('month', now() - interval '2 months') - interval '1 day')::date, 1249000, 'paid'),
  ('91000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'NW-2025-0008', date_trunc('month', now() - interval '2 months')::date, (date_trunc('month', now() - interval '1 month') - interval '1 day')::date, 1249000, 'paid'),
  ('91000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'NW-2025-0009', date_trunc('month', now() - interval '1 month')::date, (date_trunc('month', now()) - interval '1 day')::date, 1312000, 'open'),
  ('91000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'HL-2025-0031', date_trunc('month', now() - interval '1 month')::date, (date_trunc('month', now()) - interval '1 day')::date, 486000, 'open')
ON CONFLICT (id) DO NOTHING;

INSERT INTO certificate_templates (id, tenant_id, name, body_html, orientation, is_default, updated_by) VALUES
  ('a2000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'Northwind Standard',
   E'<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n    <style>\n      body { font-family: Georgia, serif; margin: 0; padding: 64px; color: #1f2937; }\n      .frame { border: 6px double #4f46e5; padding: 56px; text-align: center; }\n      h1 { font-size: 42px; letter-spacing: 2px; margin: 0 0 8px; }\n      .name { font-size: 34px; margin: 32px 0 8px; font-weight: 700; }\n      .course { font-size: 22px; font-style: italic; margin-bottom: 32px; }\n      .meta { font-size: 13px; color: #6b7280; margin-top: 48px; }\n    </style>\n  </head>\n  <body>\n    <div class="frame">\n      <h1>Certificate of Completion</h1>\n      <p>This is to certify that</p>\n      <div class="name"><%= data.learner.name %></div>\n      <p>has successfully completed</p>\n      <div class="course"><%= data.course.title %> (<%= data.course.code %>)</div>\n      <p>Issued by <%= data.tenant.name %> on <%= data.issuedOn %></p>\n      <div class="meta">\n        Serial <%= data.serial %> &middot; Verify at <%= data.verificationUrl %>\n      </div>\n    </div>\n  </body>\n</html>',
   'landscape', true, 'a1000000-0000-4000-8000-000000000002'),

  ('a2000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'Compliance Attestation',
   E'<!doctype html>\n<html>\n  <head><meta charset="utf-8" /><style>body{font-family:Helvetica,Arial,sans-serif;padding:56px;}h1{font-size:28px;}table{width:100%;border-collapse:collapse;margin-top:24px;}td{padding:8px 0;border-bottom:1px solid #e5e7eb;}</style></head>\n  <body>\n    <h1><%= data.tenant.name %> — Compliance Attestation</h1>\n    <table>\n      <tr><td>Employee</td><td><%= data.learner.name %></td></tr>\n      <tr><td>Email</td><td><%= data.learner.email %></td></tr>\n      <tr><td>Module</td><td><%= data.course.title %></td></tr>\n      <tr><td>Completed</td><td><%= data.issuedOn %></td></tr>\n      <tr><td>Reference</td><td><%= data.serial %></td></tr>\n    </table>\n  </body>\n</html>',
   'portrait', false, 'a1000000-0000-4000-8000-000000000003'),

  ('a2000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'Helios Academy',
   E'<!doctype html>\n<html>\n  <head><meta charset="utf-8" /><style>body{font-family:Inter,system-ui,sans-serif;padding:64px;background:#0f172a;color:#e2e8f0;}h1{color:#22d3ee;}</style></head>\n  <body>\n    <h1>Helios Robotics Academy</h1>\n    <p><%= data.learner.name %> completed <%= data.course.title %> on <%= data.issuedOn %>.</p>\n    <p>Serial: <%= data.serial %></p>\n  </body>\n</html>',
   'landscape', true, 'b2000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO certificates (id, tenant_id, user_id, course_id, template_id, serial, verification_code, rendered_html, issued_at, expires_at) VALUES
  ('b3000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', 'e5000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'ACU-NW-SALES-101-7F2A91', 'D41E9C', '<html><body><h1>Certificate of Completion</h1><p>Chen Wei — Consultative Discovery</p></body></html>', now() - interval '20 days', now() + interval '2 years'),
  ('b3000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', 'e5000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'ACU-NW-COMP-200-3B8E14', '9A2F7B', '<html><body><h1>Compliance Attestation</h1><p>Jordan Blake — Data Protection Essentials</p></body></html>', now() - interval '70 days', now() + interval '295 days'),
  ('b3000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000006', 'a2000000-0000-4000-8000-000000000003', 'ACU-HL-ROB-210-C05D62', '6E31A8', '<html><body><h1>Helios Robotics Academy</h1><p>Rafael Costa — Motion Planning Fundamentals</p></body></html>', now() - interval '14 days', now() + interval '351 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_keys (id, tenant_id, user_id, label, key_prefix, key_hash, scopes, last_used_at, expires_at) VALUES
  ('c4000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002',
   'Workday roster sync', 'acu_7hK2mQ9x', encode(digest('acu_7hK2mQ9xRt4vLpB8nZcE3wYs', 'sha256'), 'hex'),
   ARRAY['roster:read','roster:write','enrollment:read'], now() - interval '2 hours', now() + interval '300 days'),
  ('c4000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003',
   'Looker reporting', 'acu_4dF8pW1n', encode(digest('acu_4dF8pW1nJq6yTb0mHxKv5aRu', 'sha256'), 'hex'),
   ARRAY['reports:read','enrollment:read','assessment:read'], now() - interval '1 day', NULL),
  ('c4000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000001',
   'Helios CI publisher', 'acu_9sG3rE7k', encode(digest('acu_9sG3rE7kMd2zXn5cVfPt8bQw', 'sha256'), 'hex'),
   ARRAY['catalog:read','catalog:write'], now() - interval '6 days', now() + interval '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webhooks (id, tenant_id, created_by, label, target_url, secret, events, active, last_status, last_fired_at) VALUES
  ('d5000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002',
   'HRIS completion sync', 'https://hooks.northwind.example/acmeu/completions', 'whsec_2Kp9mXvR4tQnB7cLdF3sYw',
   ARRAY['enrollment.completed','certificate.issued'], true, 200, now() - interval '3 hours'),
  ('d5000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003',
   'Slack #learning-ops', 'https://hooks.slack.example/services/T00/B00/XyZaBcDeFgHiJkLm', 'whsec_8Rw3nQtY6vBxK2mPcJ5dLz',
   ARRAY['enrollment.created','submission.graded'], true, 200, now() - interval '25 minutes'),
  ('d5000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000001',
   'Helios data lake', 'https://ingest.helios.example/v2/events', 'whsec_5Tz7bNmK9wQrX3pVdG4hCs',
   ARRAY['enrollment.created','enrollment.completed'], false, 503, now() - interval '9 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integrations (id, tenant_id, provider, display_name, manifest_url, config, credentials, status, connected_by, connected_at) VALUES
  ('e6000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'workday', 'Workday HCM',
   'https://registry.acmeu.com/plugins/workday/manifest.json',
   '{"tenantHost":"northwind.workday.example","syncCadence":"nightly","fieldMap":{"WORKER_ID":"externalId","PRIMARY_WORK_EMAIL":"email"}}'::jsonb,
   'ZW5jOnYxOndvcmtkYXktc2VydmljZS1hY2NvdW50', 'connected', 'a1000000-0000-4000-8000-000000000002', now() - interval '160 days'),
  ('e6000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'okta', 'Okta SSO',
   NULL,
   '{"issuer":"https://northwind.okta.example","clientId":"0oa8f2k1xYzAbCdEf","scopes":["openid","profile","email"]}'::jsonb,
   'ZW5jOnYxOm9rdGEtY2xpZW50LXNlY3JldA==', 'connected', 'a1000000-0000-4000-8000-000000000001', now() - interval '300 days'),
  ('e6000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'gitlab', 'GitLab Autograder',
   'https://registry.acmeu.com/plugins/gitlab-grader/manifest.json',
   '{"projectPath":"helios/robotics-benchmarks","runnerTag":"sim-cluster"}'::jsonb,
   'ZW5jOnYxOmdpdGxhYi1wYXQ=', 'connected', 'b2000000-0000-4000-8000-000000000001', now() - interval '70 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO saved_reports (id, tenant_id, owner_id, name, dataset, segment, dimensions, metrics, filters, schedule, last_run_at) VALUES
  ('f7000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003',
   'Compliance completion by month', 'enrollments', E'c.category = ''compliance''',
   ARRAY['month','status'], ARRAY['count','completions'], '{}'::jsonb, 'monthly', now() - interval '5 days'),
  ('f7000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002',
   'Enablement engagement', 'enrollments', E'e.progress_pct > 0',
   ARRAY['course','level'], ARRAY['count','avg_progress'], '{}'::jsonb, 'weekly', now() - interval '2 days'),
  ('f7000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003',
   'Grading turnaround', 'submissions', NULL,
   ARRAY['assignment','status'], ARRAY['count','avg_score'], '{}'::jsonb, NULL, now() - interval '11 days'),
  ('f7000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000004',
   'Academy revenue', 'revenue', E'o.status = ''paid''',
   ARRAY['month','course'], ARRAY['count','net'], '{}'::jsonb, 'monthly', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (tenant_id, user_id, kind, title, body, link, severity, read_at, created_at) VALUES
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', 'assignment', 'Feedback on Discovery call summary', 'Oliver Grant returned your submission with comments.', '/courses/e5000000-0000-4000-8000-000000000001/submissions/41000000-0000-4000-8000-000000000002', 'warning', NULL, now() - interval '12 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000006', 'reminder', 'Annual compliance closes in 9 days', 'Data Protection Essentials must be completed before the end of the month.', '/courses/e5000000-0000-4000-8000-000000000002', 'info', now() - interval '5 days', now() - interval '9 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000007', 'certificate', 'Your certificate is ready', 'Consultative Discovery — certificate ACU-NW-SALES-101-7F2A91 has been issued.', '/certificates', 'success', now() - interval '19 days', now() - interval '20 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003', 'system', 'Roster import completed', '48 records processed, 3 skipped as duplicates.', '/integrations', 'info', NULL, now() - interval '4 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002', 'billing', 'Invoice NW-2025-0009 is open', 'Payment is due within 30 days.', '/billing', 'info', NULL, now() - interval '6 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000003', 'assignment', 'Planner benchmark graded', 'You scored 132 of 150.', '/courses/e5000000-0000-4000-8000-000000000006', 'success', now() - interval '19 days', now() - interval '20 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000001', 'system', 'Webhook delivery failing', 'Helios data lake returned 503 on the last 12 attempts and has been paused.', '/integrations', 'error', NULL, now() - interval '9 days');

INSERT INTO feature_flags (key, description, enabled, rollout) VALUES
  ('catalog.recommendations', 'Personalised course recommendations on the dashboard', true, '{"percentage":100}'::jsonb),
  ('reports.scheduled_delivery', 'Email delivery of scheduled report runs', true, '{"tenants":["northwind"]}'::jsonb),
  ('assessment.auto_grading', 'Route eligible submissions to the grading service', true, '{"percentage":40}'::jsonb),
  ('credentials.pdf_export', 'Server-side PDF rendering for certificates', false, '{}'::jsonb),
  ('catalog.public_marketplace', 'Expose public courses to unauthenticated visitors', false, '{}'::jsonb),
  ('platform.legacy_v0', 'Keep the v0 API surface available for the mobile client', true, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO support_tickets (tenant_id, user_id, subject, body_md, status, priority, assignee_id) VALUES
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000009', 'Compliance module will not save progress',
   E'The incident response lesson resets to zero every time I close the tab. Safari 17 on macOS.', 'open', 'high',
   'a1000000-0000-4000-8000-000000000003'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000008', 'Certificate name is wrong',
   E'My certificate shows my legal name rather than my preferred name. Can this be reissued?', 'open', 'normal', NULL),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000003', 'Simulation cluster SSO expiring early',
   E'Credentials expire after roughly ten minutes rather than the documented eight hours.', 'pending', 'high',
   'b2000000-0000-4000-8000-000000000001');

INSERT INTO audit_logs (tenant_id, actor_id, actor_label, action, target_type, target_id, metadata, ip_address, created_at) VALUES
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002', 'marcus.reed@northwind.example', 'auth.login', 'user', 'a1000000-0000-4000-8000-000000000002', '{}'::jsonb, '203.0.113.44', now() - interval '2 hours'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000003', 'priya.nair@northwind.example', 'roster.imported', NULL, NULL, '{"created":48,"skipped":3}'::jsonb, '203.0.113.51', now() - interval '4 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000004', 'oliver.grant@northwind.example', 'submission.graded', 'submission', '41000000-0000-4000-8000-000000000001', '{"score":88}'::jsonb, '198.51.100.12', now() - interval '25 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000002', 'marcus.reed@northwind.example', 'api_key.created', 'api_key', 'c4000000-0000-4000-8000-000000000001', '{"scopes":["roster:read","roster:write","enrollment:read"]}'::jsonb, '203.0.113.44', now() - interval '160 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'a1000000-0000-4000-8000-000000000001', 'dana.whitfield@northwind.example', 'certificate.issued', 'certificate', 'b3000000-0000-4000-8000-000000000001', '{"courseId":"e5000000-0000-4000-8000-000000000001"}'::jsonb, '203.0.113.8', now() - interval '20 days'),
  ('8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'b2000000-0000-4000-8000-000000000001', 'ingrid.haas@helios.example', 'webhook.created', 'webhook', 'd5000000-0000-4000-8000-000000000003', '{}'::jsonb, '192.0.2.77', now() - interval '95 days');

UPDATE courses SET seats_taken = (
  SELECT count(*) FROM enrollments e WHERE e.course_id = courses.id AND e.role = 'learner'
);
