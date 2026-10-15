import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminHref, adminTabFrom, sanitizeUserQuery } from "./admin.js";
import { filterReportGroups, groupReportedTargets, reportFiltersFrom } from "./moderation.js";

describe("admin console", () => {
  it("keeps known tabs and sends everything else to the dashboard", () => {
    assert.equal(adminTabFrom("reports"), "reports");
    assert.equal(adminTabFrom("users"), "users");
    assert.equal(adminTabFrom("nope"), "dashboard");
    assert.equal(adminHref("dashboard"), "/admin");
    assert.equal(adminHref("reports", { type: "comment", status: "pending" }), "/admin?tab=reports&type=comment&status=pending");
    assert.equal(sanitizeUserQuery("  대머리_% "), "대머리");
  });

  it("groups reports per target and filters the inbox", () => {
    const reports = [
      { id: "1", reporter_id: "a", target_type: "post", target_id: "p1", reason: "spam", created_at: "2026-10-01T00:00:00Z" },
      { id: "2", reporter_id: "b", target_type: "post", target_id: "p1", reason: "spam", created_at: "2026-10-02T00:00:00Z" },
      { id: "3", reporter_id: "a", target_type: "user", target_id: "u1", reason: "other", created_at: "2026-10-03T00:00:00Z" },
      { id: "4", reporter_id: "c", target_type: "comment", target_id: "c1", reason: "hate_abuse", created_at: "2026-10-04T00:00:00Z" },
    ];
    const reviews = [
      { id: "r1", target_type: "comment", target_id: "c1", status: "cleared", ai_summary: "" },
    ];
    const groups = groupReportedTargets(reports, reviews);
    const post = groups.find((group) => group.target_id === "p1");

    assert.equal(post.reportCount, 2);
    assert.equal(post.reporterCount, 2);
    assert.equal(post.inboxStatus, "pending");
    assert.equal(groups.find((group) => group.target_id === "c1").inboxStatus, "done");
    assert.equal(filterReportGroups(groups, reportFiltersFrom({ type: "user" })).length, 1);
    assert.equal(filterReportGroups(groups, { status: "pending", sort: "count" })[0].target_id, "p1");
    assert.equal(filterReportGroups(groups, reportFiltersFrom({ status: "done", type: "comment" })).length, 1);
  });
});
