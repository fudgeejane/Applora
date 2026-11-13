import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import toast from "react-hot-toast";

import LegalDocument from "../../components/LegalDocument";
import { useAuth } from "../../contexts/useAuth";
import api from "../../lib/api";
import { legalDocuments } from "../../lib/legalDocuments";
import { useStyle } from "../../components/ui/Style";

const sections = [
  { id: "contact", name: "Contact" },
  { id: "terms", name: "Terms of Service" },
  { id: "privacy", name: "Privacy Policy" },
];

function HelpCenterPage() {
  const style = useStyle();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("contact");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const accountName =
    user?.displayName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Applora user";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setFeedback(null);
    try {
      const { data } = await api.post("/support/contact", { message });
      setMessage("");
      toast.success(
        data.message || "Your message has been sent to our support team.",
      );
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error.response?.data?.message ||
          "We couldn't send your message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const content = legalDocuments[activeSection];

  return (
    <main className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className={`mb-1 text-2xl font-semibold sm:text-3xl ${style.primaryText}`}>
          Help Center
        </h1>
        <p className={`text-sm sm:text-base ${style.secondaryText}`}>
          Find important information about using Applora or get in touch with
          our team.
        </p>
      </header>

      <div className="grid items-start min-w-0 gap-4  lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Help Center sections"
          className={`flex flex-col gap-4 rounded-md border p-4 ${style.secondaryBg} ${style.border}`}
        >
          {sections.map(({ id, name }) => {
            const selected = activeSection === id;
            return (
              <button
                key={id}
                id={`help-tab-${id}`}
                type="button"
                aria-current={selected ? "page" : undefined}
                aria-controls="help-center-panel"
                onClick={() => setActiveSection(id)}
                className={`flex min-w-max items-center gap-2.5 border-l-2 px-3 py-2 text-left transition lg:min-w-0 ${
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

        <section
          id="help-center-panel"
          aria-labelledby={`help-tab-${activeSection}`}
          className={`min-w-0 rounded-md border p-4 sm:p-6 lg:p-8 ${style.border} ${style.secondaryBg}`}
        >
          {content ? (
            <LegalDocument document={content} style={style} titleLevel="h2" />
          ) : (
            <div className="mx-auto max-w-2xl">
              <h2 className={`text-2xl font-bold ${style.headingText}`}>
                Contact support
              </h2>
              <p className={`mt-2 leading-7 ${style.secondaryText}`}>
                Send us a message and our team will follow up using your account
                email.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="support-account-name"
                    className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${style.tertiaryText}`}
                  >
                    Your name
                  </label>
                  <input
                    id="support-account-name"
                    type="text"
                    value={accountName}
                    readOnly
                    aria-readonly="true"
                    className={`w-full cursor-not-allowed rounded-md border px-3 py-2 text-sm ${style.input} ${style.border}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="support-account-email"
                    className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${style.tertiaryText}`}
                  >
                    Your email
                  </label>
                  <input
                    id="support-account-email"
                    type="email"
                    value={user?.email || ""}
                    placeholder="Email unavailable"
                    readOnly
                    aria-readonly="true"
                    className={`w-full cursor-not-allowed rounded-md border px-3 py-2 text-sm ${style.input} ${style.border}`}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6">
                <label
                  htmlFor="support-message"
                  className={`mb-2 block text-sm font-semibold ${style.primaryText}`}
                >
                  Message
                </label>
                <textarea
                  id="support-message"
                  name="message"
                  rows={6}
                  maxLength={4000}
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="How can we help?"
                  className={`w-full resize-y rounded-md border px-4 py-3 leading-6 ${style.input} ${style.inputFocus} ${style.inputPlaceholder}`}
                />
                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className={`text-xs ${style.tertiaryText}`}>
                    {message.length}/4000 characters
                  </p>
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${style.buttonBlue}`}
                  >
                    {sending ? "Sending..." : "Send message"}
                    {sending ? (
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {feedback && (
                  <p
                    role={feedback.type === "error" ? "alert" : "status"}
                    className={`mt-4 text-sm ${
                      feedback.type === "error" ? style.redText : "text-green-600"
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HelpCenterPage;
