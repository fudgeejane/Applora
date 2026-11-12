import { CalendarDays, Clock3, Link2, Mail, MapPin, Phone, UserRound } from "lucide-react";

export function getPlatformMeta(value) {
  if (!value) return { label: "Zoom", accent: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300" };
  const normalized = String(value).toLowerCase();
  if (normalized.includes("meet")) return { label: "Google Meet", accent: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300" };
  if (normalized.includes("teams")) return { label: "Teams", accent: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300" };
  if (normalized.includes("zoom")) return { label: "Zoom", accent: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300" };
  if (normalized.includes("webex")) return { label: "Webex", accent: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300" };
  return { label: "Link", accent: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200" };
}

export const fieldIcons = {
  calendar: CalendarDays,
  clock: Clock3,
  user: UserRound,
  mail: Mail,
  phone: Phone,
  link: Link2,
  map: MapPin,
};
