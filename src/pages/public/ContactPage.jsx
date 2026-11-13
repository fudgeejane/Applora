
import { useState } from "react";
import { LoaderCircle, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useStyle } from "../../components/ui/Style";
import api from "../../lib/api";

function ContactPage() {
  const style = useStyle();
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    try {
      const { data } = await api.post("/support/public-contact", form);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success(
        data.message || "Your message has been sent to our support team.",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "We couldn't send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`min-h-screen px-6 pb-20 pt-30 ${style.primaryBg}`}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">

          <h1 className={`mt-5 text-4xl font-bold ${style.headingText}`}>
            Contact Us
          </h1>

          <p className={`mt-4 ${style.secondaryText}`}>
            Have a question or need assistance? Send us a message.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`mt-12 space-y-5 rounded-2xl border p-7 sm:p-10 ${style.card}`}
        >
          <div>
            <label
              htmlFor="contact-name"
              className="mb-2 block text-sm font-medium"
            >
              Full Name
            </label>
            <input
              id="contact-name"
              name="name"
              required
              type="text"
              maxLength={120}
              autoComplete="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={updateField}
              className={`w-full rounded-lg border px-4 py-2 ${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-medium"
            >
              Email Address
            </label>
            <input
              id="contact-email"
              name="email"
              required
              type="email"
              maxLength={254}
              autoComplete="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={updateField}
              className={`w-full rounded-lg border px-4 py-2 ${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="mb-2 block text-sm font-medium"
            >
              Subject
            </label>
            <input
              id="contact-subject"
              name="subject"
              required
              type="text"
              maxLength={160}
              placeholder="What is your message about?"
              value={form.subject}
              onChange={updateField}
              className={`w-full rounded-lg border px-4 py-2 ${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="mb-2 block text-sm font-medium"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={5}
              maxLength={4000}
              placeholder="Write your message..."
              value={form.message}
              onChange={updateField}
              className={`w-full rounded-lg border px-4 py-2 ${style.input} ${style.inputFocus} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? (
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <MessageCircle size={18} aria-hidden="true" />
            )}
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ContactPage;
