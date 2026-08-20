import type { Role } from './roles';

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  plan: string;
  branding: Record<string, unknown>;
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
}

export interface CourseSummary {
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

export interface LessonSummary {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  kind: string;
  durationMins: number;
  position: number;
  isPreview: boolean;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
