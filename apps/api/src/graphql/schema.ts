import { buildSchema } from 'graphql';

export const schema = buildSchema(/* GraphQL */ `
  scalar JSON

  type Tenant {
    id: ID!
    slug: String!
    name: String!
    plan: String!
    seatsPurchased: Int!
    branding: JSON
    settings: JSON
    createdAt: String!
    users(limit: Int): [User!]!
    courses(limit: Int): [Course!]!
  }

  type PaymentMethod {
    id: ID!
    brand: String!
    last4: String!
    expMonth: Int!
    expYear: Int!
    providerToken: String!
    billingZip: String
    isDefault: Boolean!
  }

  type User {
    id: ID!
    email: String!
    displayName: String!
    title: String
    bio: String
    avatarUrl: String
    role: String!
    status: String!
    locale: String!
    credits: Int!
    mfaEnabled: Boolean!
    mfaSecret: String
    passwordHash: String
    preferences: JSON
    createdAt: String!
    lastLoginAt: String
    tenant: Tenant
    paymentMethods: [PaymentMethod!]!
    enrollments(limit: Int): [Enrollment!]!
    submissions(limit: Int): [Submission!]!
    certificates: [Certificate!]!
  }

  type Course {
    id: ID!
    code: String!
    title: String!
    subtitle: String
    descriptionMd: String
    level: String!
    category: String!
    tags: [String!]!
    visibility: String!
    status: String!
    priceCents: Int!
    seatLimit: Int
    seatsTaken: Int!
    durationMins: Int!
    ratingAvg: Float!
    ratingCount: Int!
    publishedAt: String
    owner: User
    tenant: Tenant
    enrollments(limit: Int): [Enrollment!]!
    assignments: [Assignment!]!
  }

  type Enrollment {
    id: ID!
    role: String!
    status: String!
    progressPct: Int!
    enrolledAt: String!
    completedAt: String
    user: User
    course: Course
  }

  type Assignment {
    id: ID!
    title: String!
    kind: String!
    maxPoints: Int!
    dueAt: String
    graderRef: String
    course: Course
    submissions(limit: Int): [Submission!]!
  }

  type Submission {
    id: ID!
    attempt: Int!
    status: String!
    score: Float
    bodyMd: String
    feedbackMd: String
    submittedAt: String!
    gradedAt: String
    user: User
    assignment: Assignment
    course: Course
  }

  type Certificate {
    id: ID!
    serial: String!
    verificationCode: String!
    issuedAt: String!
    expiresAt: String
    course: Course
    user: User
  }

  type StatBucket {
    key: String!
    value: Float!
    label: String
  }

  type AuditEntry {
    id: ID!
    action: String!
    actorLabel: String
    targetType: String
    targetId: String
    metadata: JSON
    ipAddress: String
    createdAt: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    users(limit: Int, role: String, search: String): [User!]!
    tenant: Tenant
    course(id: ID!): Course
    courses(limit: Int, search: String, category: String): [Course!]!
    enrollment(id: ID!): Enrollment
    submission(id: ID!): Submission
    certificate(serial: String!): Certificate
    enrollmentTrend(courseId: ID, months: Int): [StatBucket!]!
    completionByCategory: [StatBucket!]!
    revenueTrend(months: Int): [StatBucket!]!
    auditTrail(limit: Int, action: String): [AuditEntry!]!
  }

  type Mutation {
    updateProfile(displayName: String, title: String, bio: String, locale: String): User
    setPreference(key: String!, value: JSON!): JSON
    transferCredits(toUserId: ID!, amount: Int!): Int
    markNotificationsRead: Boolean
  }
`);
