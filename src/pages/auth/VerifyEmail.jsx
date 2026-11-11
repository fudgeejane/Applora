
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useStyle } from "../../components/ui/Style";
import api from "../../lib/api";

function VerifyEmail() {
  const style = useStyle();
  const location = useLocation();
  const navigate = useNavigate();
  const codeInputRefs = useRef([]);

  const email = location.state?.email;
  const initialSentAt = location.state?.sentAt ?? null;

  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [resendUntil, setResendUntil] = useState(
    initialSentAt === null ? null : initialSentAt + 120000
  );
  const [currentTime, setCurrentTime] = useState(null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/signup", { replace: true });
    }
  }, [email, navigate]);

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      setSentAt((previous) => previous ?? now);
      setResendUntil((previous) => previous ?? (initialSentAt ?? now) + 120000);
      setCurrentTime(now);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [initialSentAt]);

  // Countdown calculations
  const elapsedSeconds = Math.max(
    0,
    currentTime === null || sentAt === null
      ? 0
      : Math.floor((currentTime - sentAt) / 1000)
  );

  const otpRemaining = Math.max(0, 120 - elapsedSeconds);
  const resendRemaining = Math.max(
    0,
    currentTime === null || resendUntil === null
      ? 120
      : Math.ceil((resendUntil - currentTime) / 1000)
  );

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const handleCodeChange = (index, inputValue) => {
    const digits = inputValue.replace(/\D/g, "");

    if (digits.length > 1) {
      const pastedCode = digits.slice(0, 6);
      setCode(pastedCode);
      codeInputRefs.current[Math.min(pastedCode.length, 5)]?.focus();
      return;
    }

    const nextCode = code.split("");
    nextCode[index] = digits;
    const updatedCode = nextCode.join("").slice(0, 6);
    setCode(updatedCode);

    if (digits && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, event) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCopyCode = async () => {
    if (code.length !== 6) {
      toast.error("Enter the full verification code before copying it.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      toast.success("Verification code copied.");
    } catch {
      toast.error("Unable to copy the code. Please copy it manually.");
    }
  };

  // Verify email
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      toast.error("Please enter your 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/verify-email", {
        email,
        code,
      });

      if (response.data.success) {
        toast.success("Email verified successfully!", { duration: 1200 });

        setTimeout(() => {
          navigate("/signin", {
            replace: true,
            state: { email },
          });
        }, 1200);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to verify your email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResend = async () => {
    try {
      setResending(true);

      const response = await api.post("/auth/resend-verification", {
        email,
      });

      if (response.data.success) {
        const now = Date.now();

        setSentAt(now);
        setResendUntil(now + 120000);
        setCurrentTime(now);
        setCode("");

        toast.success("A new verification code has been sent to your email.");
      }
    } catch (err) {
      const data = err.response?.data;

      toast.error(
        data?.message ||
          "Unable to resend the verification code. Please try again."
      );

      // Synchronize the countdown with the backend if needed
      if (data?.retryAfterSeconds) {
        setResendUntil(Date.now() + data.retryAfterSeconds * 1000);
      } else if (data?.expiresInSeconds) {
        const remaining = data.expiresInSeconds;
        const elapsed = 120 - remaining;

        setSentAt(Date.now() - elapsed * 1000);
      }
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <section
      className={`flex min-h-screen items-center justify-center px-6 pb-16 pt-32 ${style.secondaryBg}`}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-8 sm:p-10 ${style.card}`}
      >
        <div className="text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${style.secondaryBg}`}
          >
            <span className="text-2xl">✉</span>
          </div>

          <h1 className={`mt-6 text-3xl font-bold ${style.headingText}`}>
            Verify Your Email
          </h1>

          <p className={`mt-3 text-sm ${style.secondaryText}`}>
            We sent a 6-digit verification code to:
          </p>

          <p className="mt-2 break-all font-semibold text-blue-600">
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          <div>
            <label
              htmlFor="verificationCode"
              className="mb-2 block text-sm font-medium"
            >
              Verification Code
            </label>

            <div
              className="flex justify-center gap-2 sm:gap-3"
              role="group"
              aria-label="6-digit verification code"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  aria-label={`Verification digit ${index + 1}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={index === 0 ? 6 : 1}
                  value={code[index] || ""}
                  onChange={(event) =>
                    handleCodeChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  disabled={loading}
                  className={`h-12 w-10 rounded-lg border text-center text-xl font-bold sm:h-14 sm:w-12 ${style.input} ${style.inputFocus}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={loading || code.length !== 6}
              className="mt-3 text-sm font-medium text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy entered code
            </button>
          </div>

          <div className={`text-center text-sm ${style.secondaryText}`}>
            {otpRemaining > 0 ? (
              <p>
                Code expires in{" "}
                <span className="font-semibold tabular-nums text-blue-600">
                  {formatTime(otpRemaining)}
                </span>
              </p>
            ) : (
              <p className="font-medium text-red-500">
                Your verification code has expired.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className={`text-sm ${style.secondaryText}`}>
            Didn't receive the code?
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendRemaining > 0}
            className="mt-2 font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : resendRemaining > 0
                ? `Resend code in ${formatTime(resendRemaining)}`
                : "Resend Verification Code"}
          </button>
        </div>

        <p className={`mt-7 text-center text-sm ${style.secondaryText}`}>
          Already verified?{" "}
          <Link to="/signin" className="font-semibold text-blue-600">
            Sign In
          </Link>
        </p>
      </div>
    </section>
  );
}

export default VerifyEmail;
