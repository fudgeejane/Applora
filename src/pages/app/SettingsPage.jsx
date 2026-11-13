import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Camera,
  Check,
  LoaderCircle,
  MapPin,
  Monitor,
  RefreshCw,
  Smartphone,
  Pencil,
  X,
} from "lucide-react";

import { useAuth } from "../../contexts/useAuth";
import { useStyle } from "../../components/ui/Style";
import api from "../../lib/api";

const PROFILE_FIELDS = {
  firstName: "",
  lastName: "",
  bio: "",
  phone: "",
  location: "",
  avatarUrl: "",
};

function Field({ id, label, value, onChange, disabled = false, ...props }) {
  const style = useStyle();
  return (
    <div>
      <label htmlFor={id} className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-md border px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70 ${style.input} ${style.inputFocus}`}
        {...props}
      />
    </div>
  );
}

function SettingsCard({ children, className = "" }) {
  const style = useStyle();
  return (
    <section className={`rounded-md border p-5 shadow-sm sm:p-6 ${style.card} ${className}`}>
      {children}
    </section>
  );
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function phoneDigits(value = "") {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatPhoneInput(value) {
  const digits = phoneDigits(value);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
    .filter(Boolean)
    .join(" ");
}

function formatPhoneForSave(value) {
  const digits = phoneDigits(value);
  return digits ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim() : "";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Unavailable";
}

function SettingsPage() {
  const style = useStyle();
  const { user, setUser, clearAuthState } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState(() => ({
    ...PROFILE_FIELDS,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
    phone: user?.phone || "",
    location: user?.location || "",
    avatarUrl: user?.avatarUrl || "",
  }));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarInputRef = useRef(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationSearchEnabled, setLocationSearchEnabled] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [requestingPasswordReset, setRequestingPasswordReset] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSession, setRevokingSession] = useState("");
  const [revokingOtherSessions, setRevokingOtherSessions] = useState(false);
  const [sessionRefresh, setSessionRefresh] = useState(0);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    [user?.firstName, user?.lastName]
  );
  const profileName = user?.displayName?.trim() || fullName || user?.email || "Applora member";
  const displayedAvatar = avatarPreview || profile.avatarUrl;

  useEffect(() => {
    if (!avatarPreview) return undefined;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    if (
      activeSection !== "Profile" ||
      !isEditingProfile ||
      !locationSearchEnabled ||
      profile.location.trim().length < 2 ||
      profile.location.trim().length > 100
    ) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/auth/locations/search", {
          params: { q: profile.location.trim() },
          signal: controller.signal,
        });
        setLocationSuggestions(response.data.locations || []);
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setLocationSuggestions([]);
          setLocationError(
            error.response?.data?.message || "Location search is unavailable."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSection, isEditingProfile, locationSearchEnabled, profile.location]);

  useEffect(() => {
    if (activeSection !== "Account") return undefined;
    let active = true;
    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const response = await api.get("/auth/sessions");
        if (active) setSessions(response.data.sessions);
      } catch (error) {
        if (active) {
          toast.error(error.response?.data?.message || "Unable to load active sessions.");
        }
      } finally {
        if (active) setSessionsLoading(false);
      }
    };
    void loadSessions();
    const interval = window.setInterval(() => void loadSessions(), 30000);
    const refreshOnFocus = () => void loadSessions();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [activeSection, sessionRefresh]);

  const handleProfileCancel = () => {
    setProfile({
      ...PROFILE_FIELDS,
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      bio: user?.bio || "",
      phone: user?.phone || "",
      location: user?.location || "",
      avatarUrl: user?.avatarUrl || "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setLocationSuggestions([]);
    setLocationSearchEnabled(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    setIsEditingProfile(false);
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile pictures must be 5 MB or smaller.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setProfile((current) => ({ ...current, avatarUrl: "" }));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    const digits = phoneDigits(profile.phone);
    if (digits && (digits.length !== 10 || !digits.startsWith("9"))) {
      toast.error("Enter a valid Philippine mobile number with 10 digits after +63.");
      return;
    }
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("firstName", profile.firstName);
      formData.append("lastName", profile.lastName);
      formData.append("bio", profile.bio);
      formData.append("phone", formatPhoneForSave(profile.phone));
      formData.append("location", profile.location);
      formData.append("displayName", "");
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      } else {
        formData.append("avatarUrl", profile.avatarUrl);
      }
      const { data } = await api.patch("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data.user);
      setProfile({
        ...PROFILE_FIELDS,
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        bio: data.user.bio || "",
        phone: data.user.phone || "",
        location: data.user.location || "",
        avatarUrl: data.user.avatarUrl || "",
      });
      setAvatarFile(null);
      setAvatarPreview("");
      setLocationSuggestions([]);
      setLocationSearchEnabled(false);
      setIsEditingProfile(false);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save your profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      toast.error("Your new passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast.success("Password changed. Please sign in again.");
      clearAuthState();
      navigate("/signin", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to change your password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setRequestingPasswordReset(true);
    try {
      const { data } = await api.post("/auth/password-reset/request-current");
      toast.success(data.message || "If an account exists, a reset link will be sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to request a password reset.");
    } finally {
      setRequestingPasswordReset(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSession(sessionId);
    try {
      await api.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      toast.success("Session signed out.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to sign out this session.");
    } finally {
      setRevokingSession("");
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm("Sign out all other devices? This device will stay signed in.")) {
      return;
    }
    setRevokingOtherSessions(true);
    try {
      await api.delete("/auth/sessions/others");
      setSessions((current) => current.filter((session) => session.current));
      toast.success("All other devices have been signed out.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to sign out other devices.");
    } finally {
      setRevokingOtherSessions(false);
    }
  };

  const sectionItems = [
    { name: "Profile" },
    { name: "Account" },
  ];

  return (
    <main className="mx-auto max-w-6xl pb-12">

      <header className="mb-8">
        <h1 className={`mb-1 text-2xl font-semibold sm:text-3xl ${style.primaryText}`}>
          Settings
        </h1>
        <p className={`text-sm sm:text-base ${style.secondaryText}`}>
          Manage your account settings, profile information, and security preferences.
        </p>
      </header>
      
      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className={`flex flex-col gap-4 border rounded-md p-4 ${style.secondaryBg} ${style.border}`}>
          {sectionItems.map(({ name }) => {
            const selected = activeSection === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSection(name)}
                aria-current={selected ? "page" : undefined}
                className={`flex min-w-max border-l-2 items-center gap-2.5 px-3 py-2 text-left transition lg:min-w-0 ${
                  selected
                    ? `border-l-blue-500 ${style.primaryText} ${style.blueText} ${style.blueBg2}`
                    : `${style.secondaryText} ${style.hoverBg}`
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{name}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-5">
          {activeSection === "Account" ? (
            <>
              <SettingsCard>
                <h1 className={`mb-5 uppercase font-semibold ${style.primaryText}`}>
                  Account information
                </h1>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="username" label="Username" value={user?.displayName || user?.email?.split("@")[0] || ""} disabled readOnly />
                  <Field id="account-email" label="Email address" type="email" value={user?.email || ""} disabled readOnly />
                </div>
                <p className={`mt-3 flex items-center gap-2 text-xs ${style.secondaryText}`}>
                  <Check size={14} className="text-emerald-500" />
                  {user?.isEmailVerified ? "Email address verified" : "Email address not verified"}
                  <span className="ml-auto">Email and username can’t be edited here.</span>
                </p>
              </SettingsCard>

              <SettingsCard>
                 <div className="mb-5 flex sm:items-start sm:justify-between">
                  <h1 className={`uppercase font-semibold ${style.primaryText}`}>
                  Password & Security
                </h1>
                
                    <button
                      type="button"
                      onClick={handlePasswordResetRequest}
                      disabled={requestingPasswordReset}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${style.buttonGray}`}
                    >
                      {requestingPasswordReset ? "Sending..." : "Forgot password?"}
                    </button>
                 </div>
                  
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <Field
                    id="current-password"
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password.currentPassword}
                    onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                    placeholder="Enter your current password"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="new-password"
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password.newPassword}
                      onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                      placeholder="At least 8 characters"
                    />
                    <Field
                      id="confirm-password"
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password.confirmPassword}
                      onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  <p className={`text-xs ${style.tertiaryText}`}>
                    Use at least 8 characters, including uppercase, lowercase, and a number.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className={`rounded-md px-4 py-2.5 text-sm ${style.buttonBlue}`}
                    >
                      {changingPassword ? "Updating..." : "Change password"}
                    </button>
                  </div>
                </form>
              </SettingsCard>

              <SettingsCard>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                     <h1 className={`mb-5 uppercase font-semibold ${style.primaryText}`}>
                 Login Sessions
                </h1>
                    
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleRevokeOtherSessions}
                      disabled={
                        revokingOtherSessions ||
                        !sessions.some((session) => !session.current)
                      }
                      className={`text-sm ${style.buttonGray} px-4 py-2 rounded-md`}
                    >
                      {revokingOtherSessions
                        ? "Signing out..."
                        : "Log out all devices"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionRefresh((current) => current + 1)}
                      disabled={sessionsLoading}
                      aria-label="Refresh sessions"
                      className={`inline-flex items-center gap-2 rounded-lg border p-2 text-sm font-medium disabled:opacity-50 ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                    >
                      <RefreshCw size={15} className={sessionsLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>
                {sessionsLoading ? (
                  <p className={`py-4 text-sm ${style.secondaryText}`}>Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className={`py-4 text-sm ${style.secondaryText}`}>No active sessions found.</p>
                ) : (
                  <ul className={`divide-y ${style.divide}`}>
                    {sessions.map((session) => (
                      <li key={session.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.grayBg2} ${style.secondaryText}`}>
                          {/mobile|tablet|ipad/i.test(session.deviceType || "") ? <Smartphone size={18} /> : <Monitor size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${style.primaryText}`}>
                            {session.deviceName || session.deviceType}
                            <span className={`ml-2 text-xs font-normal ${style.secondaryText}`}>
                              {session.deviceType}
                            </span>
                            {session.current && <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">This device</span>}
                          </p>
                          <p className={`mt-1 text-xs ${style.secondaryText}`}>
                            {session.os} · {session.browser}
                            {session.browserVersion ? ` ${session.browserVersion}` : ""}
                          </p>
                          <p className={`mt-1 text-xs ${style.tertiaryText}`}>
                            Signed in {formatDate(session.createdAt)}
                          </p>
                          <p className={`mt-1 text-xs ${style.tertiaryText}`}>
                            {session.location || "Approximate location unavailable"}
                          </p>
                        </div>
                        {!session.current && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingSession === session.id}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${style.secondaryText} ${style.hoverBg}`}
                          >
                            {revokingSession === session.id ? "Signing out..." : "Log out"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </SettingsCard>
            </>
          ) : (
            <>
              <SettingsCard>
                <h1 className={`mb-5 uppercase font-semibold ${style.primaryText}`}>
                  Personal information
                </h1>
               
                  
                

                <form onSubmit={handleProfileSave}>
               
                  <div className={`mb-6 flex flex-col gap-5 rounded-xl border p-4 sm:flex-row sm:items-start ${style.inputBorder} ${style.input}`}>
                    {displayedAvatar ? (
                      <img src={displayedAvatar} alt={`${profileName} profile`} className="h-20 w-20 shrink-0 rounded-full border object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                        {initialsFor(profileName) || "A"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${style.primaryText}`}>Profile picture</p>
                      <p className={`mt-1 text-sm ${style.secondaryText}`}>Upload a JPG, PNG, or WebP image up to 5 MB.</p>
                      {isEditingProfile && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input
                            ref={avatarInputRef}
                            id="profile-picture"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAvatarSelect}
                            className="sr-only"
                          />
                          <label
                            htmlFor="profile-picture"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                          >
                            <Camera size={16} />
                            Choose picture
                          </label>
                          {(avatarPreview || profile.avatarUrl) && (
                            <button
                              type="button"
                              onClick={handleAvatarRemove}
                              className={`rounded-xl border px-3.5 py-2 text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                            >
                              Remove picture
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                      <button 
                      type="button" 
                      onClick={() => setIsEditingProfile(true)} 
                      className={`rounded-md border p-2 ${style.secondaryButton}`}
                    >
                       <Pencil size={16} />
                    </button>
                
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="profile-first-name"
                      label="First name"
                      placeholder="Enter your first name"
                      value={profile.firstName}
                      onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                      disabled={!isEditingProfile}
                      maxLength={50}
                      required
                    />
                    <Field
                      id="profile-last-name"
                      label="Last name"
                      placeholder="Enter your last name"
                      value={profile.lastName}
                      onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                      disabled={!isEditingProfile}
                      maxLength={50}
                      required
                    />
                    <div>
                      <label htmlFor="profile-phone" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
                        Contact number
                      </label>
                      <div className={`flex w-full items-center rounded-md border px-3.5 py-2.5 text-sm ${style.input} ${style.inputFocus}`}>
                        <span className={`mr-2 select-none border-r pr-2 ${style.secondaryText}`}>+63</span>
                        <input
                          id="profile-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="9XX XXX XXXX"
                          value={formatPhoneInput(profile.phone)}
                          onChange={(event) => setProfile({
                            ...profile,
                            phone: formatPhoneInput(event.target.value),
                          })}
                          disabled={!isEditingProfile}
                          aria-invalid={Boolean(
                            phoneDigits(profile.phone) &&
                            (phoneDigits(profile.phone).length !== 10 ||
                              !phoneDigits(profile.phone).startsWith("9"))
                          )}
                          className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                      {phoneDigits(profile.phone) &&
                        (phoneDigits(profile.phone).length !== 10 ||
                          !phoneDigits(profile.phone).startsWith("9")) && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                            Enter 10 digits after +63, starting with 9.
                          </p>
                        )}
                    </div>
                    <div className="relative">
                      <label htmlFor="profile-location" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
                        Location
                      </label>
                      <div className="relative">
                        <input
                          id="profile-location"
                          placeholder="Search city, municipality, province, or country"
                          value={profile.location}
                          onChange={(event) => {
                            setProfile({ ...profile, location: event.target.value });
                            setLocationSearchEnabled(true);
                            setLocationSuggestions([]);
                            setLocationLoading(
                              event.target.value.trim().length >= 2 &&
                                event.target.value.trim().length <= 100
                            );
                            setLocationError(
                              event.target.value.trim().length > 100
                                ? "Search is limited to 100 characters."
                                : ""
                            );
                          }}
                          disabled={!isEditingProfile}
                          maxLength={120}
                          autoComplete="off"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-expanded={isEditingProfile && (
                            profile.location.trim().length >= 2 &&
                            (locationLoading || Boolean(locationError) || locationSuggestions.length > 0)
                          )}
                          aria-controls="profile-location-suggestions"
                          className={`w-full rounded-md border px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70 ${style.input} ${style.inputFocus}`}
                        />
                        {locationLoading && (
                          <LoaderCircle
                            size={16}
                            aria-label="Searching locations"
                            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                          />
                        )}
                      </div>
                      {isEditingProfile && locationSearchEnabled && profile.location.trim().length >= 2 && (
                        <div
                          id="profile-location-suggestions"
                          role="listbox"
                          className={`absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg ${style.dropdownBg}`}
                        >
                          {locationLoading ? (
                            <p className={`px-3 py-2.5 text-sm ${style.secondaryText}`}>Searching locations...</p>
                          ) : locationError ? (
                            <p className={`px-3 py-2.5 text-sm ${style.secondaryText}`} role="status">{locationError}</p>
                          ) : locationSuggestions.length ? (
                            locationSuggestions.map((location) => (
                              <button
                                key={location}
                                type="button"
                                role="option"
                                aria-selected={profile.location === location}
                                onClick={() => {
                                  setProfile({ ...profile, location });
                                  setLocationSearchEnabled(false);
                                  setLocationSuggestions([]);
                                }}
                                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm ${style.primaryText} ${style.hoverBg}`}
                              >
                                <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />
                                <span>{location}</span>
                              </button>
                            ))
                          ) : (
                            <p className={`px-3 py-2.5 text-sm ${style.secondaryText}`} role="status">
                              No locations found. Try a different search.
                            </p>
                          )}
                        </div>
                      )}
                      <p className={`mt-1 text-xs ${style.tertiaryText}`}>
                        Suggestions by{" "}
                        <a
                          href="https://www.openstreetmap.org/copyright"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          © OpenStreetMap contributors
                        </a>
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="profile-bio" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>Bio / About me</label>
                      <textarea
                        id="profile-bio"
                        rows={4}
                        maxLength={500}
                        placeholder="Share a little about yourself..."
                        value={profile.bio}
                        onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                        disabled={!isEditingProfile}
                        className={`w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70 ${style.input} ${style.inputFocus}`}
                      />
                      {isEditingProfile && <p className={`mt-1 text-right text-xs ${style.tertiaryText}`}>{profile.bio.length}/500</p>}
                    </div>
                  </div>

                  {isEditingProfile && (
                    <div className={`mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end ${style.border}`}>
                      <button type="button" onClick={handleProfileCancel} disabled={savingProfile} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${style.border} ${style.secondaryText} ${style.hoverBg}`}>
                        <X size={16} />
                        Cancel
                      </button>
                      <button type="submit" disabled={savingProfile} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                        <Check size={16} />
                        {savingProfile ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </form>
              </SettingsCard>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;
