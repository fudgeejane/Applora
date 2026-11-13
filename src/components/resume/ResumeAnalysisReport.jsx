import { useState } from "react";
import { useStyle } from "../ui/Style";

function getScoreLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  return "Needs work";
}

function ScoreRing({ score, style }) {
  const safeScore = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - safeScore / 100);
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center" role="img" aria-label={`ATS score ${safeScore} out of 100, ${getScoreLabel(safeScore)}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className={style.isDarkMode ? "text-[#333333]" : "text-slate-200"} />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-500 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="text-center">
        <strong className={`block text-2xl font-bold ${style.primaryText}`}>{safeScore}</strong>
        <span className={`text-xs ${style.mutedText}`}>out of 100</span>
      </span>
    </div>
  );
}

export function ResumeAnalysisProgress({ style }) {
  return (
    <div role="status" className={`rounded-lg border p-4 ${style.border} ${style.secondaryBg}`}>
      <p className={`text-sm font-medium ${style.primaryText}`}>Analyzing resume</p>
      <div
        role="progressbar"
        aria-label="Resume analysis progress"
        aria-valuetext="Analysis in progress"
        className={`mt-3 h-2 overflow-hidden rounded-full ${style.isDarkMode ? "bg-blue-950" : "bg-blue-100"}`}
      >
        <div className="resume-analysis-progress-bar h-full rounded-full bg-blue-600" />
      </div>
      <p className={`mt-2 text-xs ${style.mutedText}`}>This may take a moment.</p>
    </div>
  );
}

function AnalysisCard({ title, children, style, id, flat = false }) {
  return (
    <section id={id} className={`scroll-mt-24 min-w-0 ${flat ? `border-b pb-4 ${style.border}` : `rounded-lg border p-4 sm:p-5 ${style.border} ${style.secondaryBg}`}`}>
      <h2 className={`text-base font-semibold ${style.primaryText}`}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextList({ items, style }) {
  if (!items?.length) return <p className={`text-sm ${style.mutedText}`}>No items provided.</p>;
  return (
    <ul className={`list-disc space-y-2.5 pl-5 text-sm leading-6 ${style.secondaryText}`}>
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="pl-1">{item}</li>
      ))}
    </ul>
  );
}

function OccupationCard({ analysis, style, flat }) {
  const [expandedMatch, setExpandedMatch] = useState("");
  return (
    <AnalysisCard title="Occupation match" style={style} id="analysis-occupation" flat={flat}>
      <p className={`text-xl font-semibold ${style.primaryText}`}>{analysis.occupation.primary}</p>
      {analysis.occupation.alternatives?.length > 0 && (
        <div className="mt-4">
          <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${style.mutedText}`}>Other possible matches</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.occupation.alternatives.map(({ title, rationale }) => (
              <div key={title}>
                <button
                  type="button"
                  aria-expanded={expandedMatch === title}
                  onClick={() => setExpandedMatch((current) => current === title ? "" : title)}
                  className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.border} ${style.primaryText} ${style.hoverBg}`}
                >
                  {title}
                </button>
                {expandedMatch === title && (
                  <p className={`mt-2 max-w-xl text-sm leading-6 ${style.secondaryText}`}>{rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </AnalysisCard>
  );
}

function ImprovementChecklist({ improvements, style, compact, flat }) {
  const [checked, setChecked] = useState({});
  const [showAll, setShowAll] = useState(false);
  const visibleItems = compact && !showAll ? improvements.slice(0, 3) : improvements;
  if (!improvements?.length) return <p className={`text-sm ${style.mutedText}`}>No score improvements provided.</p>;
  return (
    <div>
      <ul className="space-y-2.5">
        {visibleItems.map((item, index) => {
          const priority = index === 0 ? "High" : index < 3 ? "Medium" : "Low";
          return (
            <li key={`${index}-${item}`} className={`flex min-w-0 items-start gap-3 ${flat ? `border-b py-3 last:border-0 ${style.border}` : `rounded-lg border p-3 ${style.border}`}`}>
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={(event) => setChecked((current) => ({ ...current, [index]: event.target.checked }))}
                aria-label={`Mark improvement complete: ${item}`}
                className="mt-1 h-4 w-4 shrink-0 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <span className={`min-w-0 flex-1 text-sm leading-6 ${checked[index] ? `line-through ${style.mutedText}` : style.secondaryText}`}>{item}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-300" : priority === "Medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-slate-500/10 text-slate-600 dark:text-slate-300"}`}>{priority}</span>
            </li>
          );
        })}
      </ul>
      {compact && improvements.length > 3 && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {showAll ? "Show fewer" : `See all ${improvements.length} fixes`}
        </button>
      )}
    </div>
  );
}

function SummaryLists({ analysis, style, compact, flat }) {
  const [showMore, setShowMore] = useState(false);
  const strengths = compact && !showMore ? analysis.strengths.slice(0, 3) : analysis.strengths;
  const opportunities = compact && !showMore ? analysis.areasForImprovement.slice(0, 3) : analysis.areasForImprovement;
  return (
    <AnalysisCard title="Strengths and opportunities" style={style} id="analysis-strengths" flat={flat}>
      <div className={flat ? "grid gap-5" : "grid gap-5 sm:grid-cols-2"}>
        <div>
          <h3 className={`mb-3 text-sm font-semibold ${style.primaryText}`}>Strengths</h3>
          <TextList items={strengths} style={style} />
        </div>
        <div>
          <h3 className={`mb-3 text-sm font-semibold ${style.primaryText}`}>Opportunities</h3>
          <TextList items={opportunities} style={style} />
        </div>
      </div>
      {compact && (analysis.strengths.length > 3 || analysis.areasForImprovement.length > 3) && (
        <button type="button" onClick={() => setShowMore((value) => !value)} className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {showMore ? "See less" : "See more"}
        </button>
      )}
    </AnalysisCard>
  );
}

function DetailsCards({ analysis, style, flat }) {
  return (
    <>
      <AnalysisCard title="Skills analysis" style={style} id="analysis-ats" flat={flat}>
        <p className={`mb-4 text-sm leading-6 ${style.secondaryText}`}>{analysis.skills.assessment}</p>
        <div className={flat ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
          <div><h3 className={`mb-2 text-sm font-semibold ${style.primaryText}`}>Technical skills</h3><TextList items={analysis.skills.technical} style={style} /></div>
          <div><h3 className={`mb-2 text-sm font-semibold ${style.primaryText}`}>Soft skills</h3><TextList items={analysis.skills.soft} style={style} /></div>
          <div className={flat ? "" : "sm:col-span-2"}><h3 className={`mb-2 text-sm font-semibold ${style.primaryText}`}>Keywords to consider</h3><TextList items={analysis.skills.recommendedKeywords} style={style} /></div>
        </div>
      </AnalysisCard>
      <AnalysisCard title="Section review" style={style} flat={flat}>
        <div className="space-y-4">
          <div><h3 className={`text-sm font-semibold ${style.primaryText}`}>Work experience</h3><p className={`mt-1 text-sm leading-6 ${style.secondaryText}`}>{analysis.workExperience.assessment}</p><TextList items={analysis.workExperience.rewrittenExamples} style={style} /></div>
          <div><h3 className={`text-sm font-semibold ${style.primaryText}`}>Education</h3><p className={`mt-1 text-sm leading-6 ${style.secondaryText}`}>{analysis.educationAssessment}</p></div>
          <div><h3 className={`text-sm font-semibold ${style.primaryText}`}>Formatting</h3><p className={`mt-1 text-sm leading-6 ${style.secondaryText}`}>{analysis.formattingAssessment}</p></div>
          <div><h3 className={`mb-2 text-sm font-semibold ${style.primaryText}`}>Grammar and wording</h3><TextList items={analysis.grammarIssues} style={style} /></div>
        </div>
      </AnalysisCard>
      <AnalysisCard title="Professional summary" style={style} flat={flat}>
        <p className={`text-sm leading-6 ${style.secondaryText}`}>{analysis.professionalSummary.assessment}</p>
        <p className={`mt-3 whitespace-pre-line text-sm leading-6 ${style.primaryText}`}>{analysis.professionalSummary.improved}</p>
      </AnalysisCard>
      <AnalysisCard title="Personalized recommendations" style={style} flat={flat}>
        <TextList items={analysis.recommendations} style={style} />
      </AnalysisCard>
    </>
  );
}

export default function ResumeAnalysisReport({ analysis, compact = false }) {
  const style = useStyle();
  const [showAll, setShowAll] = useState(false);
  const score = analysis.atsCompatibility.score;
  const showDetails = compact && showAll;
  return (
    <div className="space-y-4">
      <div className={compact ? "space-y-4" : "grid items-start gap-4 2xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.5fr)]"}>
        <div className={compact ? "min-w-0 space-y-4" : "min-w-0 space-y-4 2xl:sticky 2xl:top-6"}>
          <AnalysisCard title="ATS compatibility" style={style} id="analysis-overview" flat={compact}>
            <div className="flex items-center gap-4">
              <ScoreRing score={score} style={style} />
              <div>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{getScoreLabel(score)}</p>
                <p title="This is an estimate, not a result from an employer's specific ATS." className={`mt-1 text-xs ${style.mutedText}`}>
                  Estimated score
                </p>
              </div>
            </div>
            <p className={`mt-4 text-sm leading-6 ${style.secondaryText}`}>{analysis.atsCompatibility.explanation}</p>
            <p className={`mt-3 rounded-md border p-3 text-xs leading-5 ${style.border} ${style.mutedText}`}>
              This analysis is AI-generated guidance, not a recruiter&apos;s assessment. Recruiters and employers may evaluate your resume differently.
            </p>
          </AnalysisCard>
          {!compact && (
            <>
              <nav aria-label="Analysis sections" className={`rounded-lg border p-4 ${style.border} ${style.secondaryBg}`}>
                <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${style.mutedText}`}>On this report</h2>
                <div className="flex flex-wrap gap-2 2xl:flex-col">
                  {[["Overview", "analysis-overview"], ["Occupation", "analysis-occupation"], ["ATS", "analysis-ats"], ["Strengths", "analysis-strengths"], ["Fixes", "analysis-fixes"]].map(([label, id]) => (
                    <a key={id} href={`#${id}`} className={`rounded-md px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.secondaryText} ${style.hoverBg}`}>{label}</a>
                  ))}
                </div>
              </nav>
              <AnalysisCard title="Score improvements" style={style} id="analysis-fixes">
                <ImprovementChecklist improvements={analysis.atsCompatibility.improvements} style={style} />
              </AnalysisCard>
            </>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <OccupationCard analysis={analysis} style={style} flat={compact} />
          {compact && (
            <AnalysisCard title="Score improvements" style={style} id="analysis-fixes" flat>
              <ImprovementChecklist improvements={analysis.atsCompatibility.improvements} style={style} compact flat />
            </AnalysisCard>
          )}
          <SummaryLists analysis={analysis} style={style} compact={compact} flat={compact} />
          {(!compact || showDetails) && <DetailsCards analysis={analysis} style={style} flat={compact} />}
          {(!compact || showDetails) && analysis.limitations.length > 0 && (
            <AnalysisCard title="Analysis limitations" style={style} flat={compact}>
              <TextList items={analysis.limitations} style={style} />
            </AnalysisCard>
          )}
        </div>
      </div>
      {compact && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className={`w-full border-b px-1 py-2.5 text-left text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}>
          See all analysis details
        </button>
      )}
      {compact && showAll && (
        <button type="button" onClick={() => setShowAll(false)} className={`w-full border-b px-1 py-2.5 text-left text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}>
          Show summary
        </button>
      )}
    </div>
  );
}
