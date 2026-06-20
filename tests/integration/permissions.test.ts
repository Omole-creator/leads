import { describe, it, expect } from "vitest";
import { canAccessLead, canManage, isAdmin } from "@/lib/permissions";

const admin = { id: "admin-1", role: "ADMIN" as const };
const repA = { id: "rep-a", role: "SALES_REP" as const };
const repB = { id: "rep-b", role: "SALES_REP" as const };

describe("permissions", () => {
  it("a rep can access their own lead", () => {
    expect(canAccessLead(repA, { assignedRepId: "rep-a" })).toBe(true);
  });

  it("a rep cannot access another rep's lead", () => {
    expect(canAccessLead(repA, { assignedRepId: "rep-b" })).toBe(false);
    expect(canAccessLead(repB, { assignedRepId: "rep-a" })).toBe(false);
  });

  it("an admin can access any lead", () => {
    expect(canAccessLead(admin, { assignedRepId: "rep-a" })).toBe(true);
    expect(canAccessLead(admin, { assignedRepId: null })).toBe(true);
  });

  it("only admins can manage (reassign, CRUD)", () => {
    expect(canManage(admin)).toBe(true);
    expect(canManage(repA)).toBe(false);
  });

  it("isAdmin / null user", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(repA)).toBe(false);
    expect(canAccessLead(null, { assignedRepId: "rep-a" })).toBe(false);
  });
});
