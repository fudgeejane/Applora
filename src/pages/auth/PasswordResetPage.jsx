import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { useStyle } from "../../components/ui/Style";
import { useAuth } from "../../contexts/useAuth";
import api from "../../lib/api";

function PasswordResetPage() {
  const style = useStyle();
  const navigate = useNavigate();
  const { clearAuthState } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (token && newPassword !== confirmPassword) {
      toast.error("Your passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (token) {
        const { data } = await api.post("/auth/password-reset/confirm", {
          token,
          newPassword,
          confirmPassword,
        });
        toast.success(data.message || "Password reset successfully.");
        clearAuthState();
        navigate("/signin", { replace: true });
      } else {
        const { data } = await api.post("/auth/password-reset/request", { email });
        setRequestSent(true);
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (token
            ? "Unable to reset your password. Request a new reset link."
            : "Unable to request a password reset.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`flex min-h-screen items-center justify-center px-4 py-12 ${style.primaryBg}`}>
      <section className={`w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8 ${style.card}`}>
        <h1 className={`text-2xl font-semibold ${style.primaryText}`}>
          {token ? "Choose a new password" : "Forgot your password?"}
        </h1>
        <p className={`mt-2 text-sm leading-6 ${style.secondaryText}`}>
          {token
            ? "Create a new password for your Applora account."
            : "Enter your registered email address. If an account exists, we will send a secure reset link."}
        </p>

        {requestSent ? (
          <div className={`mt-6 rounded-lg border p-4 text-sm ${style.border} ${style.secondaryText}`} role="status">
            If an account exists for that email, a password reset link will be sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {token ? (
              <>
                <div>
                  <label htmlFor="reset-new-password" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={`w-full rounded-md border px-3.5 py-2.5 text-sm ${style.input} ${style.inputFocus}`}
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm-password" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={`w-full rounded-md border px-3.5 py-2.5 text-sm ${style.input} ${style.inputFocus}`}
                  />
                </div>
                <p className={`text-xs ${style.tertiaryText}`}>
                  Use at least 8 characters, including uppercase, lowercase, and a number.
                </p>
              </>
            ) : (
              <div>
                <label htmlFor="reset-email" className={`mb-2 block text-sm font-medium ${style.primaryText}`}>
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`w-full rounded-md border px-3.5 py-2.5 text-sm ${style.input} ${style.inputFocus}`}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${style.buttonBlue}`}
            >
              {loading
                ? "Please wait..."
                : token
                  ? "Reset password"
                  : "Send reset link"}
            </button>
          </form>
        )}

        <p className={`mt-6 text-center text-sm ${style.secondaryText}`}>
          <Link to="/signin" className="font-semibold text-blue-600 hover:text-blue-700">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default PasswordResetPage;
