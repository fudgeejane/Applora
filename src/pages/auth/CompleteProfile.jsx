import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useStyle } from "../../components/ui/Style";
import api from "../../lib/api";

function CompleteProfile() {
  const style = useStyle();
  const navigate = useNavigate();

  const { refreshUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await api.patch("/auth/complete-profile", {
        firstName,
        lastName,
      });

      if (response.data.success) {
        await refreshUser();
        toast.success("Profile completed successfully.");
        navigate("/home", { replace: true });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to complete your profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`flex min-h-screen items-center justify-center px-6 py-24 ${style.secondaryBg}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 sm:p-10 ${style.card}`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold ${style.headingText}`}>
            Complete Your Profile
          </h1>

          <p className={`mt-3 text-sm ${style.secondaryText}`}>
            Tell us a little about yourself to get started with Applora.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-sm font-medium">
              First Name
            </label>
            <input
              id="firstName"
              required
              maxLength={50}
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={`w-full border px-4 py-2 rounded-lg ${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="mb-2 block text-sm font-medium">
              Last Name
            </label>
            <input
              id="lastName"
              required
              maxLength={50}
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={`w-full border px-4 py-2 rounded-lg ${style.input} ${style.inputFocus}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CompleteProfile;
