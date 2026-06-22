import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  role: Role;
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function isTutor(user: SessionUser | null | undefined): boolean {
  return user?.role === "TUTOR";
}

/** A rep may read/act on a lead only if they own it; admins may act on any. */
export function canAccessLead(
  user: SessionUser | null | undefined,
  lead: { assignedRepId: string | null },
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return lead.assignedRepId === user.id;
}

/** Admin-only actions: reassign, reps/cohorts/tracks CRUD. */
export function canManage(user: SessionUser | null | undefined): boolean {
  return isAdmin(user);
}
