import { authHandlers } from './implemented/auth';
import { volunteerHandlers } from './implemented/volunteer';
import { coordinatorHandlers } from './implemented/coordinator';
import { chatHandlers } from './implemented/chat';
import { adminHandlers } from './implemented/admin';
import { businessHandlers } from './implemented/business';
import { publicAccountPending } from './pending/public-account';
import { volunteerPending } from './pending/volunteer';
import { staffPending } from './pending/staff';

/** Faithful copies of endpoints Laravel already serves (offline demo + tests). */
export const implementedHandlers = [...authHandlers, ...volunteerHandlers, ...coordinatorHandlers, ...chatHandlers, ...adminHandlers, ...businessHandlers];

/** Endpoints the backend has not built yet. Remove entries as Laravel ships them. */
export const pendingHandlers = [...publicAccountPending, ...volunteerPending, ...staffPending];

/**
 * Pending handlers go first: some pending routes (e.g. /volunteer/events/:id) would otherwise be
 * shadowed by nothing, but ordering keeps intent explicit.
 */
export const allHandlers = [...pendingHandlers, ...implementedHandlers];
