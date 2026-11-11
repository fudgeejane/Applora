import crypto from "node:crypto";
import { getRequiredSecret } from "./authConfig.js";

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOTP = (code) => {
  return crypto
    .createHmac("sha256", getRequiredSecret("OTP_SECRET"))
    .update(code)
    .digest("hex");
};
