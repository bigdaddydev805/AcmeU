-- Enrollments, assessment activity, and discussion.

INSERT INTO enrollments (id, tenant_id, course_id, user_id, role, status, progress_pct, enrolled_at, completed_at) VALUES
  ('21000000-0000-4000-8000-000000000001', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 'learner', 'active', 65, now() - interval '40 days', NULL),
  ('21000000-0000-4000-8000-000000000002', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000007', 'learner', 'active', 100, now() - interval '55 days', now() - interval '20 days'),
  ('21000000-0000-4000-8000-000000000003', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000008', 'learner', 'active', 30, now() - interval '15 days', NULL),
  ('21000000-0000-4000-8000-000000000004', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 'learner', 'active', 100, now() - interval '80 days', now() - interval '70 days'),
  ('21000000-0000-4000-8000-000000000005', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000007', 'learner', 'active', 100, now() - interval '78 days', now() - interval '69 days'),
  ('21000000-0000-4000-8000-000000000006', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000008', 'learner', 'active', 60, now() - interval '30 days', NULL),
  ('21000000-0000-4000-8000-000000000007', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000009', 'learner', 'active', 20, now() - interval '10 days', NULL),
  ('21000000-0000-4000-8000-000000000008', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'learner', 'active', 100, now() - interval '200 days', now() - interval '198 days'),
  ('21000000-0000-4000-8000-000000000009', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'learner', 'active', 100, now() - interval '190 days', now() - interval '189 days'),
  ('21000000-0000-4000-8000-00000000000a', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000007', 'learner', 'active', 45, now() - interval '35 days', NULL),
  ('21000000-0000-4000-8000-00000000000b', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000006', 'learner', 'active', 15, now() - interval '8 days', NULL),
  ('21000000-0000-4000-8000-00000000000c', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', 'learner', 'active', 55, now() - interval '50 days', NULL),
  ('21000000-0000-4000-8000-00000000000d', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'e5000000-0000-4000-8000-000000000006', 'b2000000-0000-4000-8000-000000000003', 'learner', 'active', 70, now() - interval '45 days', NULL),
  ('21000000-0000-4000-8000-00000000000e', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0002', 'e5000000-0000-4000-8000-000000000006', 'b2000000-0000-4000-8000-000000000004', 'learner', 'active', 100, now() - interval '60 days', now() - interval '14 days'),
  ('21000000-0000-4000-8000-00000000000f', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'instructor', 'active', 0, now() - interval '210 days', NULL),
  ('21000000-0000-4000-8000-000000000010', '8f14e45f-ceea-4d4a-9f2a-1c3b6d7e0001', 'e5000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005', 'instructor', 'active', 0, now() - interval '120 days', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_progress (enrollment_id, lesson_id, state, seconds_spent) VALUES
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'completed', 740),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'completed', 1090),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'started', 420),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'completed', 700),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'completed', 1130),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000003', 'completed', 1480),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000004', 'completed', 1210),
  ('21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000005', 'completed', 900),
  ('21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000006', 'completed', 1180),
  ('21000000-0000-4000-8000-00000000000d', '11000000-0000-4000-8000-00000000000a', 'completed', 2400),
  ('21000000-0000-4000-8000-00000000000d', '11000000-0000-4000-8000-00000000000b', 'started', 900)
ON CONFLICT (enrollment_id, lesson_id) DO NOTHING;

INSERT INTO assignments (id, course_id, module_id, title, spec_md, kind, max_points, weight, rubric,
                         auto_grade, grader_ref, opens_at, due_at) VALUES
  ('31000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000003',
   'Discovery call summary', E'Submit a written summary of a real discovery call you have run in the last month.\n\nInclude:\n\n1. The business outcome the buyer described\n2. The consequence of inaction, quantified where possible\n3. The buying group as you currently understand it\n4. Your next-step commitment\n\nAnonymise the account name if the deal is under NDA.',
   'written', 100, 2.0,
   '[{"criterion":"Business outcome identified","points":30},{"criterion":"Consequence quantified","points":30},{"criterion":"Buying group mapped","points":20},{"criterion":"Clear next step","points":20}]'::jsonb,
   false, NULL, now() - interval '200 days', now() + interval '20 days'),

  ('31000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000002', 'f6000000-0000-4000-8000-000000000005',
   'Breach response scenario', E'You receive a report that a shared mailbox has been accessible to the wrong distribution list for six weeks.\n\nDescribe the first hour: containment, recording, escalation, and the notification assessment.',
   'written', 50, 1.0,
   '[{"criterion":"Containment","points":15},{"criterion":"Recording","points":10},{"criterion":"Escalation","points":15},{"criterion":"Notification assessment","points":10}]'::jsonb,
   false, NULL, now() - interval '300 days', NULL),

  ('31000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000003', 'f6000000-0000-4000-8000-000000000007',
   'Capstone forecast model', E'Build a stage-weighted forecast from the supplied dataset and submit the workbook plus a one-page commentary on where the model breaks down.',
   'project', 200, 3.0,
   '[{"criterion":"Model correctness","points":80},{"criterion":"Historical validation","points":60},{"criterion":"Commentary quality","points":60}]'::jsonb,
   false, NULL, now() - interval '110 days', now() + interval '35 days'),

  ('31000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000006', 'f6000000-0000-4000-8000-00000000000a',
   'Planner benchmark', E'Implement RRT* against the supplied benchmark suite and submit your results table.',
   'code', 150, 2.5,
   '[{"criterion":"Correctness","points":70},{"criterion":"Path quality","points":40},{"criterion":"Runtime","points":40}]'::jsonb,
   true, 'suites/rrt-star', now() - interval '60 days', now() + interval '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO submissions (id, assignment_id, course_id, user_id, attempt, body_md, status, score,
                         feedback_md, graded_by, graded_at, submitted_at) VALUES
  ('41000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000007', 1,
   E'**Account:** Regional logistics operator (NDA)\n\n**Outcome sought:** They want to cut the time between a delivery exception and the customer being told about it. Today that gap averages four hours.\n\n**Consequence:** Each hour of delay generates roughly 40 inbound support calls at an estimated £11 fully-loaded cost per call. They put the annual figure near £380k.\n\n**Buying group:** Head of Operations (economic buyer), Support Director (champion), IT Architecture (technical validation, not yet engaged).\n\n**Next step:** Architecture review booked for the 14th; I owe them an integration summary beforehand.',
   'graded', 88.00,
   E'Strong quantification and a clean next step. The buying group section would be stronger if you named the procurement path — that is usually where deals of this size stall.',
   'a1000000-0000-4000-8000-000000000004', now() - interval '25 days', now() - interval '30 days'),

  ('41000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000006', 1,
   E'**Account:** Mid-market manufacturer\n\nThe customer said their onboarding takes too long. I explained our platform can help and sent pricing.\n\nNext step: follow up next week.',
   'returned', 41.00,
   E'This reads as a product pitch rather than discovery. There is no quantified consequence and no buying group. Please re-run the call with the archetype table open in front of you and resubmit.',
   'a1000000-0000-4000-8000-000000000004', now() - interval '12 days', now() - interval '18 days'),

  ('41000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000002',
   'a1000000-0000-4000-8000-000000000008', 1,
   E'First hour: revoke the distribution list membership and snapshot the mailbox audit log before anything is purged. Record the six-week window and the categories of data exposed — this mailbox carries candidate CVs, so special category data is in scope. Escalate to the duty officer immediately; the 72-hour clock started when the report landed, not when we finish scoping.',
   'submitted', NULL, NULL, NULL, NULL, now() - interval '3 days'),

  ('41000000-0000-4000-8000-000000000004', '31000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000003',
   'a1000000-0000-4000-8000-000000000007', 1,
   E'Workbook attached. The model is consistently 12% optimistic in Q4, which tracks with commit-stage deals slipping past the fiscal boundary. I have added a seasonality adjustment on the commit stage only.',
   'submitted', NULL, NULL, NULL, NULL, now() - interval '2 days'),

  ('41000000-0000-4000-8000-000000000005', '31000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000006',
   'b2000000-0000-4000-8000-000000000003', 1,
   E'Benchmark results attached. RRT* converges within tolerance on 9 of 12 scenes; the three failures are all narrow-passage cases where the sampler starves.',
   'graded', 132.00,
   E'Good analysis of the narrow-passage failures. Consider bridge sampling as a follow-up.',
   'b2000000-0000-4000-8000-000000000002', now() - interval '20 days', now() - interval '24 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO discussion_posts (id, course_id, lesson_id, author_id, parent_id, body_md, pinned, created_at) VALUES
  ('51000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', NULL,
   'a1000000-0000-4000-8000-000000000004', NULL,
   E'Welcome to the cohort. Post your questions here rather than emailing me directly — the answers are usually useful to everyone.\n\nOffice hours are Thursdays at 15:00 UTC.',
   true, now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003',
   'a1000000-0000-4000-8000-000000000006', NULL,
   E'The consequence archetype is the one I struggle with. Asking "what happens if you do nothing" feels confrontational when the buyer has just told me they are happy with the status quo.',
   false, now() - interval '38 days'),
  ('51000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003',
   'a1000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000002',
   E'Reframe it in the third person: *"When teams in your position leave this alone for another year, what usually happens?"* It gives the buyer room to describe the risk without admitting it is theirs.',
   false, now() - interval '37 days'),
  ('51000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000001', NULL,
   'a1000000-0000-4000-8000-000000000007', NULL,
   E'Sharing the note template I ended up with after module 3 — it maps one-to-one onto the rubric, which made the assignment much faster to write.',
   false, now() - interval '22 days'),
  ('51000000-0000-4000-8000-000000000005', 'e5000000-0000-4000-8000-000000000002', NULL,
   'a1000000-0000-4000-8000-000000000003', NULL,
   E'Reminder: the annual refresh closes at the end of the month. If your completion is still showing as partial, check that the incident response module registered — a few people have reported it not saving on Safari.',
   true, now() - interval '9 days'),
  ('51000000-0000-4000-8000-000000000006', 'e5000000-0000-4000-8000-000000000006', NULL,
   'b2000000-0000-4000-8000-000000000003', NULL,
   E'Has anyone got the simulation cluster credentials working with the new SSO flow? Mine expire after about ten minutes.',
   false, now() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_reviews (course_id, user_id, rating, body) VALUES
  ('e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000007', 5, 'The question archetype table alone was worth the time.'),
  ('e5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 4, 'Good content, though module 2 runs long.'),
  ('e5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000008', 4, 'Clear and mercifully short.'),
  ('e5000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000007', 5, 'The capstone is genuinely hard in a useful way.'),
  ('e5000000-0000-4000-8000-000000000006', 'b2000000-0000-4000-8000-000000000004', 5, 'Best planning course I have taken, internal or otherwise.')
ON CONFLICT (course_id, user_id) DO NOTHING;
