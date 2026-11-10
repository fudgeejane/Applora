
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Logo from "../../assets/Logo.png";
import { useStyle } from "../../components/ui/Style";
import api from "../../lib/api";

function SignUpPage() {
  const style = useStyle();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { email, password, confirmPassword } = formData;

    // Check password confirmation
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    // Match backend password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      toast.error(
        "Password must contain at least 8 characters, including uppercase, lowercase, and a number."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        toast.success("Account created. Please verify your email.");
        navigate("/verify-email", {
          state: {
            email: response.data.email,
            sentAt: Date.now(),
          },
        });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={`flex min-h-screen items-center justify-center px-6 pb-16 pt-32 ${style.secondaryBg}`}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-8 sm:p-10 ${style.card}`}
      >
        <div className="text-center">
          <img
            src={Logo}
            alt="Applora Logo"
            className="mx-auto h-10 w-10"
          />

          <h1 className={`mt-6 text-3xl font-bold ${style.headingText}`}>
            Create Your Account
          </h1>

          <p className={`mt-3 text-sm ${style.secondaryText}`}>
            Start organizing your career journey with Applora.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className={`w-full rounded-lg px-4 py-2 border ${style.input} ${style.inputFocus}`}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className={`w-full rounded-lg px-4 py-2 border ${style.input} ${style.inputFocus}`}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className={`w-full rounded-lg px-4 py-2 border ${style.input} ${style.inputFocus}`}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className={`mt-7 text-center text-sm ${style.secondaryText}`}>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-blue-600">
            Sign In
          </Link>
        </p>
      </div>
    </section>
  );
}

export default SignUpPage;
