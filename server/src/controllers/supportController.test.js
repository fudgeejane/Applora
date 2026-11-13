import test from "node:test";
import assert from "node:assert/strict";

import {
  validatePublicSupportMessage,
  validateSupportMessage,
} from "./supportController.js";

test("support messages are trimmed and validated", () => {
  assert.deepEqual(validateSupportMessage({ message: "  I need help.  " }), {
    value: { message: "I need help." },
  });
});

test("support messages reject empty, malformed, and oversized input", () => {
  assert.match(validateSupportMessage({ message: " " }).error, /enter a message/i);
  assert.match(validateSupportMessage(null).error, /enter a message/i);
  assert.match(
    validateSupportMessage({ message: "x".repeat(4001) }).error,
    /4000 characters/i,
  );
});

test("public support messages are trimmed and validated", () => {
  assert.deepEqual(
    validatePublicSupportMessage({
      name: "  Applora User ",
      email: " user@example.com ",
      subject: "  Privacy question ",
      message: "  I have a question.  ",
    }),
    {
      value: {
        name: "Applora User",
        email: "user@example.com",
        subject: "Privacy question",
        message: "I have a question.",
      },
    },
  );
});

test("public support messages reject missing fields, invalid email, and oversized input", () => {
  assert.match(validatePublicSupportMessage({}).error, /complete all fields/i);
  assert.match(
    validatePublicSupportMessage({
      name: "Applora User",
      email: "not-an-email",
      subject: "Question",
      message: "Please help.",
    }).error,
    /valid email/i,
  );
  assert.match(
    validatePublicSupportMessage({
      name: "Applora User",
      email: "user@example.com",
      subject: "Question",
      message: "x".repeat(4001),
    }).error,
    /4000 characters/i,
  );
});
