import { motion } from "framer-motion";

export function PageTitle({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#333333] dark:text-[#E0E0E0] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-[#666666] dark:text-[#B0B0B0]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "", style, ...props }) {
  return (
    <section className={`${style.card} p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </section>
  );
}

export function SectionHeading({ title, subtitle, action, style }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className={`text-base font-semibold ${style.headingText}`}>{title}</h2>
        {subtitle && (
          <p className={`mt-1 text-xs ${style.secondaryText}`}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon, tone = "blue", style }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${style.card} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm ${style.secondaryText}`}>{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${style.headingText}`}>
            {value}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={19} />
        </span>
      </div>
      {note && <p className={`mt-3 text-xs ${style.mutedText}`}>{note}</p>}
    </motion.article>
  );
}

export function TabButton({ active, children, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : `${style.secondaryText} ${style.hoverBg}`
      }`}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, style, tone = "blue" }) {
  const colors = {
    blue: "bg-blue-600 dark:bg-blue-500",
    green: "bg-green-600 dark:bg-green-500",
    purple: "bg-purple-600 dark:bg-purple-500",
    orange: "bg-orange-500",
  };
  return (
    <div
      className={`h-2 overflow-hidden rounded-full ${style.grayBg2}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function FormField({ label, style, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1.5 block text-sm font-medium ${style.primaryText}`}>
        {label}
      </span>
      {children}
    </label>
  );
}
