export const ROLES = ['learner', 'instructor', 'manager', 'admin', 'owner'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  learner: 10,
  instructor: 20,
  manager: 30,
  admin: 40,
  owner: 50,
};

export function rankOf(role: string | undefined | null): number {
  if (!role) return 0;
  return ROLE_RANK[role as Role] ?? 0;
}

export function atLeast(role: string | undefined | null, minimum: Role): boolean {
  return rankOf(role) >= ROLE_RANK[minimum];
}

export interface Permissions {
  viewCatalog?: boolean;
  authorCourses?: boolean;
  gradeSubmissions?: boolean;
  manageRoster?: boolean;
  manageTenant?: boolean;
  manageBilling?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role | string;
  tenantId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: SessionUser;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: Role | string;
  status: string;
  locale: string;
  timezone: string;
  credits: number;
  mfaEnabled: boolean;
  preferences: Record<string, unknown>;
  createdAt: string;
  permissions?: Permissions;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface Envelope<T> {
  data: T[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  level: string;
  category: string;
  tags: string[];
  visibility: string;
  status: string;
  priceCents: number;
  seatLimit: number | null;
  seatsTaken: number;
  durationMins: number;
  heroImageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  ownerId: string;
  publishedAt: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  kind: string;
  durationMins: number;
  position: number;
  isPreview: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

export interface CourseEnrollmentRef {
  id: string;
  role: string;
  status: string;
  progress_pct: number;
}

export interface CourseDetail extends Course {
  descriptionHtml: string;
  modules: CourseModule[];
  enrollment: CourseEnrollmentRef | null;
}

export interface LessonDetail {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  kind: string;
  bodyHtml: string;
  mediaUrl: string | null;
  durationMins: number;
  position: number;
  isPreview: boolean;
}

export interface EnrollmentListItem {
  id: string;
  course_id: string;
  role: string;
  status: string;
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
  title: string;
  code: string;
  hero_image_url: string | null;
  duration_mins: number;
  category: string;
  level: string;
}

export interface AssignmentListItem {
  id: string;
  title: string;
  kind: string;
  max_points: number;
  weight: number;
  due_at: string | null;
  opens_at: string | null;
  submission_id: string | null;
  submission_status: string | null;
  score: number | null;
}

export interface AssignmentDetail {
  id: string;
  courseId: string;
  title: string;
  specHtml: string;
  kind: string;
  maxPoints: number;
  rubric: Array<Record<string, unknown>>;
  dueAt: string | null;
}

export interface SubmissionListItem {
  id: string;
  assignment_id: string;
  attempt: number;
  status: string;
  score: number | null;
  submitted_at: string;
  graded_at: string | null;
}

export interface SubmissionDetail {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  userId: string;
  authorName: string;
  attempt: number;
  bodyHtml: string;
  fileId: string | null;
  status: string;
  score: number | null;
  maxPoints: number;
  feedbackHtml: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface QueueEntry {
  id: string;
  user_id: string;
  attempt: number;
  status: string;
  score: number | null;
  submitted_at: string;
  display_name: string;
  email: string;
}

export interface DiscussionPost {
  id: string;
  parentId: string | null;
  lessonId: string | null;
  bodyHtml: string;
  pinned: boolean;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    title?: string | null;
  };
}

export interface StoredFile {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey?: string;
  url: string;
  createdAt: string;
}

export interface FileListItem {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  visibility: string;
  scan_status: string;
  created_at: string;
}

export interface CreditLedgerEntry {
  delta: number;
  balance_after: number;
  reason: string;
  reference: string | null;
  created_at: string;
}

export interface CreditsResponse {
  balance: number;
  ledger: CreditLedgerEntry[];
}

export interface Order {
  id: string;
  course_id: string | null;
  course_title: string | null;
  quantity: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency?: string;
  status: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  billing_zip: string | null;
  is_default: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  serial: string;
  issued_at: string;
  expires_at: string | null;
  course_title: string;
  code: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  orientation: string;
  is_default: boolean;
  updated_at: string;
  body_html?: string;
}

export interface Webhook {
  id: string;
  label: string;
  target_url: string;
  secret: string;
  events: string[];
  active: boolean;
  last_status: number | null;
  last_fired_at: string | null;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  request_body: string;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WebhookTestResult {
  status: number;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface Integration {
  id: string;
  provider: string;
  display_name: string;
  manifest_url: string | null;
  config: Record<string, unknown>;
  status: string;
  connected_at: string | null;
}

export interface LinkPreview {
  url: string;
  status: number;
  title: string | null;
  description: string | null;
  image: string | null;
  contentType: string | null;
  bytes: number;
}

export interface RosterImportResult {
  parsed: number;
  created: number;
  skipped: string[];
}

export interface PackageImportResult {
  extracted: number;
  files: string[];
  manifest: Record<string, unknown> | null;
}

export interface ReportDataset {
  name: string;
  dimensions: string[];
  metrics: string[];
}

export interface SavedReport {
  id: string;
  name: string;
  dataset: string;
  segment: string | null;
  dimensions: string[];
  metrics: string[];
  filters: Record<string, unknown>;
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

export interface ReportResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  id?: string;
  name?: string;
  ranAt?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  data: Notification[];
  unread: number;
}

export interface AdminUser {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  title: string | null;
  role: string;
  status: string;
  locale: string;
  credits: number;
  mfa_enabled: boolean;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface ApiKey {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  user_id?: string;
  key?: string;
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rollout: Record<string, unknown>;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string | number;
  tenant_id: string | null;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface DeviceSession {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  seats_purchased: number;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface TenantOverview {
  tenant: Tenant;
  stats: {
    users: number;
    courses: number;
    enrollments: number;
    certificates: number;
  };
}

export interface MfaEnrollment {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export interface StatBucket {
  key: string;
  value: number;
  label: string | null;
}
