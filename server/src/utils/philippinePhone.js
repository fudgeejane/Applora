const PHONE_DIGITS_PATTERN = /^9\d{9}$/;

export const normalizePhilippinePhone = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!PHONE_DIGITS_PATTERN.test(digits)) return null;

  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};
