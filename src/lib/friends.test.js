import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyFriendships,
  friendshipWith,
  looksLikeProfileLink,
  otherPartyId,
  profileSearchPattern,
  relationOf,
  sanitizeSearchTerm,
} from "./friends.js";

const me = "11111111-1111-4111-8111-111111111111";
const them = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";

describe("friendship helpers", () => {
  it("finds the other party and relation", () => {
    const incoming = {
      requester_id: them,
      addressee_id: me,
      status: "pending",
    };

    assert.equal(otherPartyId(incoming, me), them);
    assert.equal(relationOf(incoming, me), "incoming");
    assert.equal(relationOf({ ...incoming, status: "accepted" }, me), "accepted");
    assert.equal(relationOf({ requester_id: me, addressee_id: them, status: "pending" }, me), "outgoing");
    assert.equal(
      relationOf({ requester_id: me, addressee_id: them, status: "declined" }, me),
      "declined_by_them",
    );
  });

  it("classifies rows and looks up a pair", () => {
    const rows = [
      { id: "a", requester_id: them, addressee_id: me, status: "pending" },
      { id: "b", requester_id: me, addressee_id: other, status: "pending" },
      { id: "c", requester_id: me, addressee_id: them, status: "accepted" },
    ];
    const grouped = classifyFriendships(
      [
        rows[0],
        rows[1],
        { id: "d", requester_id: me, addressee_id: other, status: "accepted" },
      ],
      me,
    );

    assert.equal(grouped.incoming.length, 1);
    assert.equal(grouped.outgoing.length, 1);
    assert.equal(grouped.accepted.length, 1);
    assert.equal(friendshipWith([rows[0]], me, them)?.id, "a");
    assert.equal(friendshipWith([rows[0]], me, other), null);
    assert.equal(friendshipWith([rows[0]], me, me), null);
  });

  it("sanitizes search and reads profile links", () => {
    assert.equal(sanitizeSearchTerm("  대머리_%  "), "대머리");
    assert.equal(profileSearchPattern("대머리"), "%대머리%");
    assert.equal(profileSearchPattern("   "), "");
    assert.equal(
      looksLikeProfileLink(`/profile/${them}`),
      them,
    );
    assert.equal(looksLikeProfileLink(them), them);
    assert.equal(looksLikeProfileLink("대머리"), "");
  });
});
