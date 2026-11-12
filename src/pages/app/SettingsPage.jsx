import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell, BriefcaseBusiness, Check, ChevronRight, Eye, EyeOff, KeyRound,
  LockKeyhole, Moon, Shield, Sun, UserRound,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import { useDarkMode } from "../../components/ui/useDarkMode";
import { FormField, PageTitle, Panel, SectionHeading } from "./DashboardPage";
import { inputClass } from "./pageUtils";
import { useAuth } from "../../contexts/useAuth";
import api from "../../lib/api";

function PreferenceToggle({ label, description, checked, onChange, style }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span><span className={`block text-sm font-medium ${style.primaryText}`}>{label}</span><span className={`mt-1 block text-xs ${style.secondaryText}`}>{description}</span></span>
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
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { clearAuthState } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({ email: true, interview: true, application: false, product: false });
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const updateNotification = (key) => setNotifications((current) => ({ ...current, [key]: !current[key] }));

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      clearAuthState();
      toast.success("Password changed. Please sign in again.");
      navigate("/signin", { replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to change your password. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageTitle title="Settings" description="Manage your profile, preferences, and account." />

      <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className={`flex gap-1 overflow-x-auto rounded-2xl border p-2 lg:sticky lg:top-6 lg:flex-col ${style.card}`}>
          {[
            [UserRound, "Personal profile"],
            [BriefcaseBusiness, "Career preferences"],
            [Bell, "Notifications"],
            [Shield, "Security"],
            [Sun, "Appearance"],
            [LockKeyhole, "Privacy"],
          ].map(([Icon, name], index) => (
            <a key={name} href={`#settings-${index}`} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition sm:text-sm ${index === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : `${style.secondaryText} ${style.hoverBg}`}`}><Icon size={16} />{name}</a>
          ))}
        </nav>

        <div className="space-y-5">
          <Panel style={style} className="scroll-mt-5" id="settings-0">
            <SectionHeading title="Personal profile" subtitle="This information helps personalize your experience." style={style} />
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">JL</span>
              <div><p className={`text-sm font-semibold ${style.primaryText}`}>Jordan Lee</p><p className={`mt-0.5 text-xs ${style.secondaryText}`}>jordan.lee@email.com</p></div>
              <button type="button" className={`ml-auto rounded-lg border px-3 py-2 text-xs font-medium ${style.secondaryButton}`}>Change photo</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" style={style}><input defaultValue="Jordan" className={inputClass(style)} /></FormField>
              <FormField label="Last name" style={style}><input defaultValue="Lee" className={inputClass(style)} /></FormField>
              <FormField label="Email address" style={style}><input type="email" defaultValue="jordan.lee@email.com" className={inputClass(style)} /></FormField>
              <FormField label="Location" style={style}><input defaultValue="Manila, Philippines" className={inputClass(style)} /></FormField>
            </div>
          </Panel>

          <Panel style={style} className="scroll-mt-5" id="settings-1">
            <SectionHeading title="Career preferences" subtitle="Help us tailor your job search experience." style={style} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Current role" style={style}><input defaultValue="Product Designer" className={inputClass(style)} /></FormField>
              <FormField label="Desired role" style={style}><input defaultValue="Senior Product Designer" className={inputClass(style)} /></FormField>
              <FormField label="Preferred work setup" style={style}><select defaultValue="Hybrid" className={inputClass(style)}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></FormField>
              <FormField label="Salary expectation" style={style}><input defaultValue="₱60,000 – ₱85,000 / month" className={inputClass(style)} /></FormField>
            </div>
            <div className="mt-4"><span className={`mb-2 block text-sm font-medium ${style.primaryText}`}>Interested in</span><div className="flex flex-wrap gap-2">{["Product design", "UX research", "Design systems"].map((item) => <span key={item} className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{item}</span>)}</div></div>
          </Panel>

          <Panel style={style} className="scroll-mt-5" id="settings-2">
            <SectionHeading title="Notification preferences" subtitle="Choose which updates you’d like to receive." style={style} />
            <div className={`divide-y ${style.divide}`}>
              <PreferenceToggle label="Email notifications" description="Get a weekly roundup and important account updates." checked={notifications.email} onChange={() => updateNotification("email")} style={style} />
              <PreferenceToggle label="Interview reminders" description="Reminders before your scheduled interviews." checked={notifications.interview} onChange={() => updateNotification("interview")} style={style} />
              <PreferenceToggle label="Application updates" description="Updates and reminders for your job applications." checked={notifications.application} onChange={() => updateNotification("application")} style={style} />
              <PreferenceToggle label="Product news" description="Tips, feature announcements, and occasional updates." checked={notifications.product} onChange={() => updateNotification("product")} style={style} />
            </div>
          </Panel>

          <Panel style={style} className="scroll-mt-5" id="settings-3">
            <SectionHeading title="Security" subtitle="Keep your account safe and up to date." style={style} />
            <form onSubmit={handlePasswordChange}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Current password" style={style}>
                  <span className="relative block">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className={`${inputClass(style)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className={`absolute inset-y-0 right-0 px-3 ${style.secondaryText}`}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </FormField>
                <FormField label="New password" style={style}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter a new password"
                    className={inputClass(style)}
                  />
                </FormField>
                <FormField label="Confirm new password" style={style}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your new password"
                    className={inputClass(style)}
                  />
                </FormField>
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className={`mt-4 inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60 ${style.blueText}`}
              >
                <KeyRound size={15} />
                {changingPassword ? "Updating password..." : "Update password"}
                <ChevronRight size={15} />
              </button>
            </form>
          </Panel>

          <Panel style={style} className="scroll-mt-5" id="settings-4">
            <SectionHeading title="Appearance" subtitle="Choose how Applora looks on this device." style={style} />
            <div className="grid gap-3 sm:grid-cols-2">
              {[[Sun, "Light", false], [Moon, "Dark", true]].map(([Icon, label, dark]) => (
                <button key={label} type="button" onClick={() => dark !== isDarkMode && toggleDarkMode()} aria-pressed={dark === isDarkMode} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${dark === isDarkMode ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10" : `${style.border} ${style.hoverBg}`}`}>
                  <Icon size={19} className={dark === isDarkMode ? "text-blue-600 dark:text-blue-400" : style.secondaryText} />
                  <span className={`flex-1 text-sm font-medium ${style.primaryText}`}>{label} mode</span>
                  {dark === isDarkMode && <Check size={17} className="text-blue-600 dark:text-blue-400" />}
                </button>
              ))}
            </div>
          </Panel>

          <Panel style={style} className="scroll-mt-5" id="settings-5">
            <SectionHeading title="Privacy & account" subtitle="Manage your information and account access." style={style} />
            <div className={`divide-y ${style.divide}`}>
              <button type="button" className="flex w-full items-center gap-3 py-3 text-left"><LockKeyhole size={17} className={style.secondaryText} /><span className="flex-1"><span className={`block text-sm font-medium ${style.primaryText}`}>Privacy preferences</span><span className={`mt-1 block text-xs ${style.secondaryText}`}>Review how your profile is shared.</span></span><ChevronRight size={16} className={style.mutedText} /></button>
              <button type="button" className="flex w-full items-center gap-3 py-3 text-left"><UserRound size={17} className={style.secondaryText} /><span className="flex-1"><span className={`block text-sm font-medium ${style.primaryText}`}>Download your data</span><span className={`mt-1 block text-xs ${style.secondaryText}`}>Get a copy of your Applora information.</span></span><ChevronRight size={16} className={style.mutedText} /></button>
              <button type="button" className="flex w-full items-center gap-3 py-3 text-left"><LockKeyhole size={17} className="text-red-500" /><span className="flex-1"><span className="block text-sm font-medium text-red-600 dark:text-red-400">Delete account</span><span className={`mt-1 block text-xs ${style.secondaryText}`}>Permanently remove your account and data.</span></span><ChevronRight size={16} className={style.mutedText} /></button>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
            {saved && <span role="status" className="text-sm text-green-600 dark:text-green-400">Preferences saved locally.</span>}
            <button type="button" onClick={() => setSaved(true)} className={`rounded-lg px-5 py-2.5 text-sm font-medium ${style.buttonBlue}`}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
