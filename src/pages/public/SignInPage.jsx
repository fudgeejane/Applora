import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Logo from "../../assets/Logo.png";
import { useStyle } from "../../components/ui/Style";
import { useAuth } from "../../contexts/useAuth";
import api from "../../lib/api";

function SignInPage() {
  const style = useStyle();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, announceAuthState } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
        rememberMe,
      });

      if (response.data.success) {
        const user = response.data.user;
        setUser(user);
        announceAuthState();

        if (!user.profileCompleted) {
          navigate("/complete-profile", { replace: true });
        } else {
          navigate("/applications", { replace: true });
        }
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to sign in. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`flex min-h-screen items-center justify-center px-6 pb-16 pt-32 ${style.secondaryBg}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 sm:p-10 ${style.card}`}>
        <div className="text-center">
          <img src={Logo} alt="Applora Logo" className="mx-auto h-10 w-10" />

          <h1 className={`mt-6 text-3xl font-bold ${style.headingText}`}>
            Welcome Back
          </h1>

          <p className={`mt-3 text-sm ${style.secondaryText}`}>
            Sign in to continue your career journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email Address
            </label>

            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`w-full rounded-lg px-4 py-2 border ${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              id="password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`w-full rounded-lg px-4 py-2 border ${style.input} ${style.inputFocus}`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Remember me for 30 days</span>
          </label>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className={`mt-7 text-center text-sm ${style.secondaryText}`}>
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-blue-600">
            Sign Up
          </Link>
        </p>
      </div>
    </section>
  );
}

export default SignInPage;
