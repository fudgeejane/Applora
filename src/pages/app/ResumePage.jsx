import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownToLine, BarChart3, Check, ChevronDown, Clock3, Eye, FileText,
  MoreHorizontal, Plus, Sparkles, Upload, WandSparkles,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import {
  PageTitle, Panel, ProgressBar, SectionHeading, StatusBadge, TabButton,
} from "../../components/dashboard/DashboardUI";
import initialResumes from "../../utils/initialResumes";

export default function ResumePage() {
  const style = useStyle();
  const [searchParams] = useSearchParams();
  const requestedResume = initialResumes.findIndex((item) => item.id === searchParams.get("resumeId"));
  const [selectedResume, setSelectedResume] = useState(() => requestedResume >= 0 ? requestedResume : 0);
  const [analyzerTab, setAnalyzerTab] = useState("Overview");
  const resume = initialResumes[selectedResume];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageTitle
        title="Resume management"
        description="Build, organize, and tailor your resume for every opportunity."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium ${style.secondaryButton}`}><Upload size={16} /> Upload resume</button>
            <button type="button" className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium ${style.buttonBlue}`}><Plus size={16} /> Create resume</button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Total resumes", "3", FileText],
          ["Last updated", "Today", Clock3],
          ["Best ATS score", "86 / 100", BarChart3],
        ].map(([label, value, Icon]) => (
          <div key={label} className={`${style.card} flex items-center gap-3 p-4`}>
            <span className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Icon size={18} /></span>
            <div><p className={`text-xs ${style.secondaryText}`}>{label}</p><p className={`mt-1 text-lg font-semibold ${style.primaryText}`}>{value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <Panel style={style}>
            <SectionHeading title="Your resumes" subtitle="Select a resume to preview and manage" style={style} />
            <div className="space-y-3">
              {initialResumes.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => setSelectedResume(index)}
                  aria-pressed={selectedResume === index}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedResume === index ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-500/10" : `${style.border} ${style.hoverBg}`}`}
                >
                  <span className={`rounded-lg p-2.5 ${selectedResume === index ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : `${style.grayBg} ${style.secondaryText}`}`}><FileText size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${style.primaryText}`}>{item.title}</span>
                    <span className={`mt-1 block text-xs ${style.secondaryText}`}>{item.type} <span className="px-1">·</span> {item.updated}</span>
                  </span>
                  {item.active && <StatusBadge tone="green">Primary</StatusBadge>}
                  <MoreHorizontal size={18} className={style.mutedText} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Resume preview" subtitle={resume.title} style={style} action={<div className="flex gap-1"><button type="button" aria-label="Download resume" className={`rounded-lg p-2 ${style.hoverBg}`}><ArrowDownToLine size={17} /></button><button type="button" aria-label="More resume actions" className={`rounded-lg p-2 ${style.hoverBg}`}><MoreHorizontal size={18} /></button></div>} />
            <div className={`mx-auto max-w-xl rounded-lg border p-5 shadow-sm sm:p-8 ${style.border} ${style.secondaryBg}`}>
              <div className="border-b pb-4 text-center">
                <h3 className={`text-xl font-bold ${style.primaryText}`}>Jordan Lee</h3>
                <p className={`mt-1 text-xs ${style.secondaryText}`}>Product Designer · Manila, Philippines</p>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">jordan.lee@email.com · portfolio.jordanlee.design</p>
              </div>
              <div className="mt-4 space-y-4">
                <div><h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Profile</h4><p className={`mt-1.5 text-xs leading-5 ${style.secondaryText}`}>Product designer with 5+ years of experience creating useful, intuitive digital experiences for fast-moving teams.</p></div>
                <div><h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Experience</h4><div className="mt-1.5 flex justify-between text-xs"><strong className={style.primaryText}>Senior Product Designer · Studio North</strong><span className={style.mutedText}>2023 — Present</span></div><p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Led end-to-end design for key product experiences, improving activation by 24%.</p></div>
                <div><h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Skills</h4><p className={`mt-1.5 text-xs ${style.secondaryText}`}>Product strategy · Figma · Design systems · Prototyping · User research</p></div>
              </div>
              <div className={`mt-5 flex items-center justify-between border-t pt-3 text-xs ${style.border} ${style.mutedText}`}><span>Version 3</span><span>Last edited today</span></div>
            </div>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Version history" subtitle="Restore or compare previous versions" style={style} action={<button type="button" className={`inline-flex items-center gap-1 text-xs ${style.blueText}`}>View all <ChevronDown size={14} /></button>} />
            <div className="space-y-3">
              {[["Version 3", "Today, 9:42 AM", "Current"], ["Version 2", "November 3, 2026", "Before edits"], ["Version 1", "October 21, 2026", "Original"]].map(([version, date, detail], index) => (
                <div key={version} className="flex items-center gap-3">
                  <span className={`rounded-full p-1.5 ${index === 0 ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : `${style.grayBg} ${style.secondaryText}`}`}><Check size={14} /></span>
                  <div className="min-w-0 flex-1"><p className={`text-sm font-medium ${style.primaryText}`}>{version} <span className={`ml-1 text-xs font-normal ${style.mutedText}`}>{detail}</span></p><p className={`mt-0.5 text-xs ${style.secondaryText}`}>{date}</p></div>
                  {index !== 0 && <button type="button" className={`rounded-lg px-2.5 py-1.5 text-xs ${style.secondaryButton}`}>Restore</button>}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel style={style}>
            <SectionHeading title="AI resume analyzer" subtitle="Improve your resume for applicant tracking systems" style={style} />
            <div className={`rounded-xl border p-4 ${style.border}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[6px] border-blue-100 dark:border-blue-950">
                  <div className="absolute inset-[-6px] rounded-full border-[6px] border-blue-600 dark:border-blue-400" style={{ clipPath: "inset(0 14% 0 0)" }} />
                  <span className={`text-xl font-bold ${style.primaryText}`}>{resume.score}</span>
                </div>
                <div><p className={`font-semibold ${style.primaryText}`}>Strong match</p><p className={`mt-1 text-xs leading-5 ${style.secondaryText}`}>Your resume is looking good. A few refinements could help you stand out.</p></div>
              </div>
              <div className={`mt-4 flex rounded-lg border p-1 ${style.border}`}>
                {["Overview", "Suggestions"].map((tab) => <TabButton key={tab} active={analyzerTab === tab} onClick={() => setAnalyzerTab(tab)} style={style}>{tab}</TabButton>)}
              </div>
              {analyzerTab === "Overview" ? (
                <div className="mt-4 space-y-3">
                  {[["ATS compatibility", 86, "green"], ["Keywords", 72, "blue"], ["Readability", 92, "purple"]].map(([label, score, tone]) => <div key={label}><div className={`mb-1.5 flex justify-between text-xs ${style.secondaryText}`}><span>{label}</span><span>{score}%</span></div><ProgressBar value={score} tone={tone} style={style} /></div>)}
                </div>
              ) : (
                <ul className={`mt-4 space-y-3 text-xs ${style.secondaryText}`}>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-green-600" />Add measurable outcomes to two experience bullets.</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-green-600" />Include more role-specific skills in your summary.</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-green-600" />Your formatting is clear and easy to scan.</li>
                </ul>
              )}
              <button type="button" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${style.buttonBlue}`}><WandSparkles size={16} /> Analyze resume</button>
              <p className={`mt-2 text-center text-[11px] ${style.mutedText}`}><Sparkles size={12} className="mr-1 inline" />Static preview — AI analysis is not connected</p>
            </div>
          </Panel>

          <Panel style={style}>
            <SectionHeading title="Quick tips" style={style} />
            <div className="space-y-3">
              {["Tailor your summary to each role.", "Use action verbs to highlight impact.", "Keep your resume concise and scannable."].map((tip, index) => <div key={tip} className="flex gap-3"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${style.blueBg2} ${style.blueText}`}>{index + 1}</span><p className={`text-sm ${style.secondaryText}`}>{tip}</p></div>)}
            </div>
            <button type="button" className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${style.blueText}`}><Eye size={16} /> Explore resume guide</button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
