export function parseManilaInterviewDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || "")) {
    return null;
  }
  const midnightUtc = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(midnightUtc.getTime()) || midnightUtc.toISOString().slice(0, 10) !== date) {
    return null;
  }
  return new Date(`${date}T${time}:00+08:00`);
}
