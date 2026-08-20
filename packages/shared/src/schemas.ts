import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
  tenant: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(120),
  tenantSlug: z.string().min(1).max(64),
  inviteToken: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(10).max(200),
});

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(120).optional(),
    title: z.string().max(160).nullable().optional(),
    bio: z.string().max(4000).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    locale: z.string().max(12).optional(),
    timezone: z.string().max(64).optional(),
  })
  .passthrough();

export const preferencesSchema = z.record(z.any());

export const createCourseSchema = z.object({
  code: z.string().min(2).max(32),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional(),
  descriptionMd: z.string().max(20000).optional(),
  level: z.enum(['foundation', 'practitioner', 'advanced']).default('foundation'),
  category: z.string().max(64).default('general'),
  tags: z.array(z.string().max(40)).max(20).default([]),
  visibility: z.enum(['public', 'tenant', 'private']).default('tenant'),
  priceCents: z.number().int().min(0).max(10_000_00).default(0),
  seatLimit: z.number().int().min(1).max(100000).nullable().optional(),
});

export const catalogQuerySchema = paginationSchema.extend({
  q: z.string().max(200).optional(),
  category: z.string().max(64).optional(),
  level: z.string().max(32).optional(),
  tag: z.string().max(40).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.string().max(200).optional(),
  direction: z.string().max(8).optional(),
});

export const submissionSchema = z.object({
  bodyMd: z.string().max(50000).default(''),
  fileId: z.string().uuid().nullable().optional(),
});

export const gradeSchema = z.object({
  score: z.number().min(0).max(1000),
  feedbackMd: z.string().max(20000).optional(),
  status: z.enum(['graded', 'returned', 'resubmit']).default('graded'),
});

export const discussionPostSchema = z.object({
  bodyMd: z.string().min(1).max(20000),
  lessonId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const webhookSchema = z.object({
  label: z.string().min(1).max(120),
  targetUrl: z.string().url(),
  events: z.array(z.string().max(64)).min(1).max(30),
  active: z.boolean().default(true),
});

export const apiKeySchema = z.object({
  label: z.string().min(1).max(120),
  scopes: z.array(z.string().max(40)).min(1).max(20),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const reportSchema = z.object({
  name: z.string().min(1).max(120),
  dataset: z.enum(['enrollments', 'submissions', 'learners', 'revenue']).default('enrollments'),
  segment: z.string().max(400).nullable().optional(),
  dimensions: z.array(z.string().max(40)).max(6).default([]),
  metrics: z.array(z.string().max(40)).min(1).max(6).default(['count']),
  filters: z.record(z.any()).default({}),
  schedule: z.string().max(64).nullable().optional(),
});

export const couponRedeemSchema = z.object({
  code: z.string().min(1).max(64),
  orderId: z.string().uuid().optional(),
});

export const creditTransferSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().int(),
  note: z.string().max(200).optional(),
});

export const linkPreviewSchema = z.object({
  url: z.string().url(),
});

export const certificateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  bodyHtml: z.string().min(1).max(100000),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  isDefault: z.boolean().default(false),
});

export const notificationQuerySchema = paginationSchema.extend({
  filter: z.record(z.any()).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
