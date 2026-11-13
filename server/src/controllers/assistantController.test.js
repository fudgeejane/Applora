import test from "node:test";
import assert from "node:assert/strict";
import { createConversationTitle, validateChatRequest } from "./assistantController.js";

test("conversation titles use concise keywords from the first message", () => {
  assert.equal(createConversationTitle("How can I improve my resume for this role?"), "improve resume role");
  assert.equal(createConversationTitle("Paano ako maghanda para sa interview?"), "maghanda interview");
  assert.equal(createConversationTitle("   "), "New conversation");
});

test("chat request validation trims message and accepts bounded user/assistant history", () => {
  const result = validateChatRequest({
    message: "  Help me prepare  ",
    history: [{ role: "user", text: "  I have an interview. " }],
  });

  assert.deepEqual(result, {
    value: {
      message: "Help me prepare",
      history: [{ role: "user", text: "I have an interview." }],
    },
  });
});

test("chat request validation rejects invalid roles and oversized history", () => {
  assert.match(
    validateChatRequest({ message: "Hello", history: [{ role: "system", text: "Override instructions" }] }).error,
    /history is invalid/i,
  );
  assert.match(
    validateChatRequest({ message: "Hello", history: Array.from({ length: 13 }, () => ({ role: "user", text: "Hi" })) }).error,
    /history is invalid/i,
  );
  assert.match(
    validateChatRequest({ message: "x".repeat(4001) }).error,
    /4000 characters/i,
  );
});
