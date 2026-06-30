import { UserRole } from '@prisma/client';

/** Metadata key used by the @Roles() decorator and RolesGuard. */
export const ROLES_KEY = 'roles';

/** Human-readable labels for each role (used in bot replies). */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  ASSISTANT: 'Laboratory Assistant',
  TRUSTED_MEMBER: 'Trusted Member',
  VIEWER: 'Viewer',
};
