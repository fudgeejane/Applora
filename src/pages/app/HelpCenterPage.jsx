import { useState } from "react";
import {
  ArrowUpRight, BookOpen, ChevronDown, FileText, LockKeyhole, Mail,
  MessageCircle, Search,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import {
  FormField, PageTitle, Panel, SectionHeading,
} from "../../components/dashboard/DashboardUI";
import { inputClass } from "../../components/dashboard/dashboardStyles";

const helpTopics = [
  {
    icon: FileText,
    title: "Terms of Service",
    description: "Guidelines for using Applora and its career management features.",
    sections: [
      ["Using Applora", "Applora helps you organize resumes, job applications, interviews, and related career activities. By using the platform, you agree to use it responsibly and provide accurate information."],
      ["Your account", "You are responsible for keeping your account information current and protecting your account credentials. Do not use the platform in a way that disrupts services or violates another person's rights."],
      ["Your content", "You retain responsibility for the resumes, notes, and other information you add. Keep copies of important information you store in the platform."],
      ["Updates", "These terms may be updated as Applora develops. Any updated version will be made available on this page."],
    ],
  },
  {
    icon: LockKeyhole,
    title: "Privacy Policy",
    description: "Learn what information is used to provide your Applora experience.",
    sections: [
      ["Information you provide", "Information may include account and profile details, resumes, job application records, interview notes, and information submitted through forms."],
      ["How information is used", "Information is used to provide career management features, maintain your account, and improve the platform experience."],
      ["Your choices", "You can review and update profile and notification preferences in Settings. You may also request help with your information using the contact section below."],
      ["Security and updates", "Applora aims to use appropriate measures to protect information. This policy may be revised as the platform develops, and changes will be reflected here."],
    ],
  },
];

export default function HelpCenterPage() {
  const style = useStyle();
  const [activeTab, setActiveTab] = useState("Terms of Service");
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const activeTopic = helpTopics.find((topic) => topic.title === activeTab);
  const filteredSections = activeTopic?.sections.filter(([title, text]) =>
    `${activeTopic.title} ${activeTopic.description} ${title} ${text}`.toLowerCase().includes(normalizedQuery),
  ) || [];

  const submitContact = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageTitle
        title="Help Center"
        description="Find information about Applora, your privacy, and how to get in touch."
      />

      <div className={`mb-5 flex w-full flex-wrap gap-1 rounded-xl border p-1 ${style.border}`} role="tablist" aria-label="Help Center sections">
        {[
          { title: "Terms of Service", icon: FileText },
          { title: "Privacy Policy", icon: LockKeyhole },
          { title: "Contact", icon: MessageCircle },
        ].map(({ title, icon: Icon }) => (
          <button
            key={title}
            id={`help-tab-${title.toLowerCase().replaceAll(" ", "-")}`}
            type="button"
            role="tab"
            aria-selected={activeTab === title}
            aria-controls="help-tab-panel"
            onClick={() => {
              setActiveTab(title);
              setQuery("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
              activeTab === title
                ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                : `${style.secondaryText} ${style.hoverBg}`
            }`}
          >
            <Icon size={16} />{title}
          </button>
        ))}
      </div>

      <div
        id="help-tab-panel"
        role="tabpanel"
        aria-labelledby={`help-tab-${activeTab.toLowerCase().replaceAll(" ", "-")}`}
      >
        {activeTopic && (
          <Panel style={style}>
            <SectionHeading
              title={activeTopic.title}
              subtitle={activeTopic.description}
              style={style}
              action={<activeTopic.icon size={19} className={style.blueText} />}
            />
            <label className={`mb-3 flex items-center gap-2 rounded-lg border px-3 ${style.input}`}>
              <Search size={16} className={style.mutedText} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${activeTopic.title.toLowerCase()}...`}
                aria-label={`Search ${activeTopic.title}`}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
              />
            </label>
            <div className={`divide-y ${style.divide}`}>
              {filteredSections.map(([heading, content]) => (
                <details key={heading} className="group py-3">
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium ${style.primaryText} [&::-webkit-details-marker]:hidden`}>
                    {heading}
                    <ChevronDown size={16} className={`shrink-0 transition group-open:rotate-180 ${style.mutedText}`} />
                  </summary>
                  <p className={`pt-2 pr-5 text-sm leading-6 ${style.secondaryText}`}>{content}</p>
                </details>
              ))}
              {filteredSections.length === 0 && (
                <p className={`py-5 text-sm ${style.secondaryText}`}>No matching information. Try a different search.</p>
              )}
            </div>
          </Panel>
        )}

        {activeTab === "Contact" && (
          <Panel style={style}>
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <span className="inline-flex rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><BookOpen size={19} /></span>
                <h2 className={`mt-3 text-lg font-semibold ${style.primaryText}`}>Contact us</h2>
                <p className={`mt-1 text-sm leading-6 ${style.secondaryText}`}>Need a hand or have a question? Leave us a message and our support team will be happy to help.</p>
                <a href="mailto:support@applora.com" className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${style.blueText}`}>
                  <Mail size={16} /> support@applora.com <ArrowUpRight size={14} />
                </a>
                <p className={`mt-2 text-xs ${style.mutedText}`}>Static contact details for this preview.</p>
              </div>
              <form onSubmit={submitContact} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Name" style={style}><input required placeholder="Your name" className={inputClass(style)} /></FormField>
                  <FormField label="Email" style={style}><input required type="email" placeholder="you@example.com" className={inputClass(style)} /></FormField>
                </div>
                <FormField label="Message" style={style}><textarea required rows={3} placeholder="How can we help?" className={`${inputClass(style)} resize-y`} /></FormField>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={`text-xs ${style.mutedText}`}>{sent ? "Message noted in this static preview." : "This form is a static preview and does not send data."}</p>
                  <button type="submit" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}>Send message</button>
                </div>
              </form>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
