import crypto from "crypto";

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOTP = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};
