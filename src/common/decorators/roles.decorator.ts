import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/roles';

/**
 * Restrict a bot handler to one or more roles.
 * Must be combined with RegisteredGuard + RolesGuard.
 *
 * @example
 *   @Roles(UserRole.ADMIN)
 *   @UseGuards(RegisteredGuard, RolesGuard)
 *   @Command('register_user')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
