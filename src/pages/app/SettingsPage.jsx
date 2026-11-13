import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell, CalendarDays, Camera, Check, Clock3, Database, Eye, EyeOff,
  Globe2, KeyRound, Laptop, LockKeyhole, Mail, MapPin, Monitor, Moon,
  Save, ShieldCheck, Smartphone, Sun, UserRound,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import { useDarkMode } from "../../components/ui/useDarkMode";
import { useAuth } from "../../contexts/useAuth";
import api from "../../lib/api";

const STORAGE_KEY = "applora-settings";
const sections = [
  { id: "account", label: "Account", icon: LockKeyhole },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "preferences", label: "Preferences", icon: Globe2 },
  { id: "privacy", label: "Privacy & security", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function defaultSettings(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  return {
    profile: {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
      username: user?.email?.split("@")[0] || "",
      bio: "",
      phone: "",
      location: "",
    },
    preferences: {
      language: "English",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      dateFormat: "MMM D, YYYY",
      timeFormat: "12-hour",
    },
    privacy: { shareProfile: false, activityStatus: true },
    notifications: { email: true, push: true, announcements: true, activity: true },
  };
}

function loadSettings(user) {
  const defaults = defaultSettings(user);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") throw new Error("Saved settings have an invalid format.");
    return {
      ...defaults,
      ...parsed,
      profile: { ...defaults.profile, ...parsed.profile },
      preferences: { ...defaults.preferences, ...parsed.preferences },
      privacy: { ...defaults.privacy, ...parsed.privacy },
      notifications: { ...defaults.notifications, ...parsed.notifications },
    };
  } catch (error) {
    console.error("Unable to load saved settings:", error);
    return defaults;
  }
}

function FormField({ label, style, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1.5 block text-sm font-medium ${style.primaryText}`}>{label}</span>
      {children}
    </label>
  );
}

function SettingsCard({ id, title, description, icon: Icon, style, children }) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className={`scroll-mt-6 rounded-2xl border p-5 shadow-sm sm:p-6 ${style.card}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon size={19} />
        </span>
        <div>
          <h2 id={`settings-${id}-title`} className={`text-base font-semibold ${style.primaryText}`}>{title}</h2>
          <p className={`mt-1 text-sm leading-5 ${style.secondaryText}`}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange, style }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <span>
        <span className={`block text-sm font-medium ${style.primaryText}`}>{label}</span>
        <span className={`mt-1 block text-xs leading-5 ${style.secondaryText}`}>{description}</span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:bg-gray-700 dark:peer-checked:bg-blue-500" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const style = useStyle();
  const { themeMode, setThemeMode, isDarkMode } = useDarkMode();
  const { user, clearAuthState } = useAuth();
  const navigate = useNavigate();
  const avatarInput = useRef(null);
  const [settings, setSettings] = useState(() => loadSettings(user));
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeSection, setActiveSection] = useState("account");
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm ${style.input} ${style.inputFocus} ${style.inputPlaceholder}`;

  useEffect(() => {
    if (!avatarUrl) return undefined;
    return () => URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  const updateSetting = (group, key, value) => {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      toast.success("Settings saved on this device.");
    } catch (error) {
      console.error("Unable to save settings:", error);
      toast.error("Unable to save your settings. Please try again.");
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.next !== password.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      setChangingPassword(true);
      await api.post("/auth/change-password", {
        currentPassword: password.current,
        newPassword: password.next,
      });
      clearAuthState();
      toast.success("Password changed. Please sign in again.");
      navigate("/signin", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to change your password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const fullName = [settings.profile.firstName, settings.profile.lastName].filter(Boolean).join(" ");
  const initials = fullName
    ? fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] || "A").toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-7">
        <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.16em] ${style.mutedText}`}>Workspace / Settings</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.primaryText}`}>Settings</h1>
            <p className={`mt-1.5 max-w-2xl text-sm ${style.secondaryText}`}>Manage your account, profile, and how Applora works for you.</p>
          </div>
          <div className={`flex items-center gap-2 text-xs ${style.secondaryText}`}><ShieldCheck size={16} className="text-emerald-500" />Your account is protected</div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className={`flex gap-1 overflow-x-auto rounded-2xl border p-2 lg:sticky lg:top-6 lg:flex-col ${style.card}`}>
          {sections.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#settings-${id}`}
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? "location" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition lg:w-full ${
                activeSection === id
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : `${style.secondaryText} ${style.hoverBg}`
              }`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="whitespace-nowrap text-sm font-medium">{label}</span>
            </a>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          <SettingsCard id="account" title="Account information" description="Your sign-in details and account security." icon={LockKeyhole} style={style}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Email address" style={style}>
                <span className="relative block">
                  <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${style.mutedText}`} />
                  <input value={user?.email || ""} readOnly aria-describedby="email-note" className={`${inputClass} pl-9`} />
                </span>
                <span id="email-note" className={`mt-1.5 block text-xs ${style.mutedText}`}>Email changes are not available yet.</span>
              </FormField>
              <FormField label="Username" style={style}>
                <input value={settings.profile.username} onChange={(event) => updateSetting("profile", "username", event.target.value)} placeholder="Choose a username" className={inputClass} />
              </FormField>
            </div>
            <div className={`mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 ${style.border}`}>
              <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${style.border}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><ShieldCheck size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${style.primaryText}`}>Account security</span>
                  <span className={`mt-0.5 block text-xs ${style.secondaryText}`}>Two-factor authentication is not available yet.</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${style.grayBg2} ${style.secondaryText}`}>Protected</span>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${style.border}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.grayBg2} ${style.secondaryText}`}><Laptop size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${style.primaryText}`}>Login sessions</span>
                  <span className={`mt-0.5 block text-xs ${style.secondaryText}`}>You’re signed in on this device.</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Current</span>
              </div>
            </div>
            <div className={`mt-5 border-t pt-5 ${style.border}`}>
              <div className="mb-4">
                <h3 className={`text-sm font-semibold ${style.primaryText}`}>Change password</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Choose a strong password you don’t use elsewhere.</p>
              </div>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Current password" style={style}>
                    <span className="relative block">
                      <input type={passwordVisible ? "text" : "password"} autoComplete="current-password" required value={password.current} onChange={(event) => setPassword((current) => ({ ...current, current: event.target.value }))} className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? "Hide current password" : "Show current password"} className={`absolute inset-y-0 right-0 px-3 ${style.secondaryText}`}>
                        {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                  </FormField>
                  <FormField label="New password" style={style}>
                    <input type="password" autoComplete="new-password" required minLength={8} value={password.next} onChange={(event) => setPassword((current) => ({ ...current, next: event.target.value }))} placeholder="At least 8 characters" className={inputClass} />
                  </FormField>
                  <FormField label="Confirm new password" style={style}>
                    <input type="password" autoComplete="new-password" required minLength={8} value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} placeholder="Re-enter new password" className={inputClass} />
                  </FormField>
                </div>
                <button type="submit" disabled={changingPassword} className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${style.secondaryButton}`}>
                  <KeyRound size={15} />{changingPassword ? "Updating password..." : "Update password"}
                </button>
              </form>
            </div>
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Delete account</h3>
              <p className="mt-1 text-xs leading-5 text-red-700/80 dark:text-red-300/80">Account deletion is not available in Settings yet. Contact support if you need help with your account.</p>
            </div>
          </SettingsCard>

          <SettingsCard id="profile" title="Personal profile" description="Add a little context so your workspace feels like yours." icon={UserRound} style={style}>
            <div className={`mb-5 flex flex-wrap items-center gap-4 rounded-xl border p-4 ${style.border}`}>
              <button type="button" onClick={() => avatarInput.current?.click()} aria-label="Choose profile picture" className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-lg font-semibold text-blue-700 ring-4 ring-blue-50 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/5">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-[#1e1e1e]"><Camera size={12} /></span>
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${style.primaryText}`}>Profile picture</p>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Choose a photo from your device. Preview only; uploads are not available yet.</p>
                <input ref={avatarInput} type="file" accept="image/*" className="sr-only" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && file.type.startsWith("image/")) setAvatarUrl(URL.createObjectURL(file));
                  else if (file) toast.error("Choose an image file.");
                }} />
              </div>
              <button type="button" onClick={() => avatarInput.current?.click()} className={`rounded-lg border px-3 py-2 text-xs font-medium ${style.secondaryButton}`}>Choose photo</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" style={style}>
                <input value={settings.profile.firstName} onChange={(event) => updateSetting("profile", "firstName", event.target.value)} placeholder="Your first name" className={inputClass} />
              </FormField>
              <FormField label="Last name" style={style}>
                <input value={settings.profile.lastName} onChange={(event) => updateSetting("profile", "lastName", event.target.value)} placeholder="Your last name" className={inputClass} />
              </FormField>
              <FormField label="Display name" style={style}>
                <input value={settings.profile.displayName} onChange={(event) => updateSetting("profile", "displayName", event.target.value)} placeholder="How should we address you?" className={inputClass} />
              </FormField>
              <FormField label="Phone number" style={style}>
                <input type="tel" autoComplete="tel" value={settings.profile.phone} onChange={(event) => updateSetting("profile", "phone", event.target.value)} placeholder="+1 (555) 000-0000" className={inputClass} />
              </FormField>
              <FormField label="Location" style={style}>
                <span className="relative block">
                  <MapPin size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${style.mutedText}`} />
                  <input value={settings.profile.location} onChange={(event) => updateSetting("profile", "location", event.target.value)} placeholder="City, country" className={`${inputClass} pl-9`} />
                </span>
              </FormField>
              <FormField label="About me" style={style} className="sm:col-span-2">
                <textarea rows={3} maxLength={280} value={settings.profile.bio} onChange={(event) => updateSetting("profile", "bio", event.target.value)} placeholder="A short introduction..." className={`${inputClass} resize-y`} />
                <span className={`mt-1 block text-right text-xs ${style.mutedText}`}>{settings.profile.bio.length}/280</span>
              </FormField>
            </div>
          </SettingsCard>

          <SettingsCard id="preferences" title="Preferences" description="Set the language, appearance, and formats you prefer." icon={Globe2} style={style}>
            <FormField label="Language" style={style} className="max-w-md">
              <select value={settings.preferences.language} onChange={(event) => updateSetting("preferences", "language", event.target.value)} className={inputClass} style={{ colorScheme: isDarkMode ? "dark" : "light" }}>
                <option>English</option><option>Español</option><option>Français</option><option>日本語</option>
              </select>
            </FormField>
            <div className="mt-5">
              <p className={`mb-2 text-sm font-medium ${style.primaryText}`}>Theme</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "light", label: "Light", icon: Sun, description: "Bright and clear" },
                  { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
                  { value: "system", label: "System", icon: Monitor, description: "Follow your device" },
                ].map(({ value, label, icon: Icon, description }) => (
                  <button key={value} type="button" onClick={() => { setThemeMode(value); setSaved(false); }} aria-pressed={themeMode === value} className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${themeMode === value ? "border-blue-500 bg-blue-50/70 dark:bg-blue-500/10" : `${style.border} ${style.hoverBg}`}`}>
                    <Icon size={18} className={themeMode === value ? "text-blue-600 dark:text-blue-400" : style.secondaryText} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${style.primaryText}`}>{label}</span>
                      <span className={`mt-0.5 block text-xs ${style.secondaryText}`}>{description}</span>
                    </span>
                    {themeMode === value && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
            <div className={`mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 ${style.border}`}>
              <FormField label="Date format" style={style}>
                <span className="relative block">
                  <CalendarDays size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${style.mutedText}`} />
                  <select value={settings.preferences.dateFormat} onChange={(event) => updateSetting("preferences", "dateFormat", event.target.value)} className={`${inputClass} pl-9`} style={{ colorScheme: isDarkMode ? "dark" : "light" }}>
                    <option value="MMM D, YYYY">Nov 13, 2026</option><option value="DD/MM/YYYY">13/11/2026</option><option value="MM/DD/YYYY">11/13/2026</option>
                  </select>
                </span>
              </FormField>
              <FormField label="Time format" style={style}>
                <span className="relative block">
                  <Clock3 size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${style.mutedText}`} />
                  <select value={settings.preferences.timeFormat} onChange={(event) => updateSetting("preferences", "timeFormat", event.target.value)} className={`${inputClass} pl-9`} style={{ colorScheme: isDarkMode ? "dark" : "light" }}>
                    <option value="12-hour">12-hour (1:30 PM)</option><option value="24-hour">24-hour (13:30)</option>
                  </select>
                </span>
              </FormField>
              <FormField label="Time zone" style={style} className="sm:col-span-2">
                <span className="relative block">
                  <Globe2 size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${style.mutedText}`} />
                  <input readOnly value={settings.preferences.timeZone} className={`${inputClass} pl-9`} />
                </span>
              </FormField>
            </div>
          </SettingsCard>

          <SettingsCard id="privacy" title="Privacy & security" description="Review privacy choices, devices, and account data." icon={ShieldCheck} style={style}>
            <div className={`divide-y ${style.divide}`}>
              <ToggleRow label="Share profile" description="Allow your profile details to be visible to other Applora users." checked={settings.privacy.shareProfile} onChange={(event) => updateSetting("privacy", "shareProfile", event.target.checked)} style={style} />
              <ToggleRow label="Show activity status" description="Let others know when you’re active in Applora." checked={settings.privacy.activityStatus} onChange={(event) => updateSetting("privacy", "activityStatus", event.target.checked)} style={style} />
            </div>
            <div className={`mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 ${style.border}`}>
              <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${style.border}`}>
                <Laptop size={18} className={style.blueText} />
                <div className="min-w-0"><p className={`text-sm font-medium ${style.primaryText}`}>Active devices</p><p className={`mt-0.5 text-xs ${style.secondaryText}`}>This browser · Current session</p></div>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${style.border}`}>
                <Smartphone size={18} className={style.secondaryText} />
                <div className="min-w-0"><p className={`text-sm font-medium ${style.primaryText}`}>Login history</p><p className={`mt-0.5 text-xs ${style.secondaryText}`}>Session history is not available yet.</p></div>
              </div>
            </div>
            <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 ${style.grayBg2}`}>
              <Database size={17} className={`mt-0.5 shrink-0 ${style.secondaryText}`} />
              <div>
                <p className={`text-sm font-medium ${style.primaryText}`}>Data and permissions</p>
                <p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Your profile preferences are saved in this browser. Downloading or managing stored account data is not available here yet.</p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard id="notifications" title="Notification preferences" description="Choose which updates you’d like to receive." icon={Bell} style={style}>
            <div className={`divide-y ${style.divide}`}>
              <ToggleRow label="Email notifications" description="Important account updates and helpful reminders." checked={settings.notifications.email} onChange={(event) => updateSetting("notifications", "email", event.target.checked)} style={style} />
              <ToggleRow label="Push notifications" description="Timely updates in your browser." checked={settings.notifications.push} onChange={(event) => updateSetting("notifications", "push", event.target.checked)} style={style} />
              <ToggleRow label="System announcements" description="Product news, maintenance notices, and new features." checked={settings.notifications.announcements} onChange={(event) => updateSetting("notifications", "announcements", event.target.checked)} style={style} />
              <ToggleRow label="Activity updates" description="Updates related to your applications and interviews." checked={settings.notifications.activity} onChange={(event) => updateSetting("notifications", "activity", event.target.checked)} style={style} />
            </div>
            <p className={`mt-4 rounded-lg px-3 py-2.5 text-xs leading-5 ${style.grayBg2} ${style.secondaryText}`}>
              Notification delivery controls are saved on this device and will be connected to your account preferences in a future update.
            </p>
          </SettingsCard>

          <div className={`sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur ${style.card} ${isDarkMode ? "bg-[#1e1e1e]/95" : "bg-white/95"}`}>
            <p role="status" className={`text-xs sm:text-sm ${saved ? "text-emerald-600 dark:text-emerald-400" : style.secondaryText}`}>
              {saved ? "Saved on this device" : "Changes are saved on this device only."}
            </p>
            <button type="button" onClick={saveSettings} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition ${style.buttonBlue}`}>
              <Save size={16} />Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}