import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import { isValidProfilePicture } from "./authController.js";

const imageFile = (name, mimetype, buffer) => ({
  originalname: name,
  mimetype,
  buffer,
  size: buffer.length,
});

test("profile picture validation accepts supported image signatures", () => {
  assert.equal(
    isValidProfilePicture(imageFile("portrait.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00]))),
    true
  );
  assert.equal(
    isValidProfilePicture(imageFile("portrait.png", "image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))),
    true
  );
  assert.equal(
    isValidProfilePicture(imageFile("portrait.webp", "image/webp", Buffer.from("RIFF0000WEBP"))),
    true
  );
});

test("profile picture validation rejects mismatched or oversized files", () => {
  assert.equal(
    isValidProfilePicture(imageFile("portrait.png", "image/jpeg", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))),
    false
  );
  assert.equal(
    isValidProfilePicture(imageFile("portrait.svg", "image/svg+xml", Buffer.from("<svg/>"))),
    false
  );
  assert.equal(
    isValidProfilePicture(imageFile("portrait.jpg", "image/jpeg", Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(5 * 1024 * 1024),
    ]))),
    false
  );
});
