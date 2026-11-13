import test from "node:test";
import assert from "node:assert/strict";

import { normalizePhilippinePhone } from "./philippinePhone.js";

test("normalizes Philippine mobile numbers into the +63 format", () => {
  assert.equal(normalizePhilippinePhone("09171234567"), "+63 917 123 4567");
  assert.equal(normalizePhilippinePhone("+63 917-123-4567"), "+63 917 123 4567");
  assert.equal(normalizePhilippinePhone(""), "");
});

test("rejects incomplete and non-Philippine mobile numbers", () => {
  assert.equal(normalizePhilippinePhone("0917123456"), null);
  assert.equal(normalizePhilippinePhone("+1 917 123 4567"), null);
  assert.equal(normalizePhilippinePhone("abc"), null);
});
