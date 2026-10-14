import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { notificationHref, notificationText } from "./notifications.js";

const postId = "33333333-3333-4333-8333-333333333333";

describe("notification copy", () => {
  it("uses generic wording and never the post or comment text", () => {
    const item = {
      type: "post_comment",
      post_id: postId,
      comment_id: "44444444-4444-4444-8444-444444444444",
      actor: { display_name: "바다" },
      title: "숨긴 제목",
      body: "숨긴 본문",
    };

    const text = notificationText(item);
    assert.equal(text, "바다 님이 내 글에 댓글을 남겼습니다.");
    assert.equal(text.includes("숨긴"), false);
    assert.equal(notificationText({ type: "comment_reply", actor: { display_name: "" } }), "누군가 내 댓글에 답글을 남겼습니다.");
    assert.equal(notificationText({ type: "friend_request", actor: { display_name: "달" } }), "달 님이 친구를 요청했습니다.");
    assert.equal(
      notificationText({ type: "friend_accepted", actor: { display_name: "달" } }),
      "달 님이 친구 요청을 받아 주었습니다.",
    );
  });

  it("links friends to the friends page and comments to the post", () => {
    assert.equal(notificationHref({ type: "friend_request" }), "/friends");
    assert.equal(notificationHref({ type: "friend_accepted" }), "/friends");
    assert.equal(
      notificationHref({ type: "comment_reply", post_id: postId }),
      `/hobbies/post/${postId}#comments`,
    );
    assert.equal(notificationHref({ type: "post_comment", post_id: "nope" }), "/notifications");
  });
});
