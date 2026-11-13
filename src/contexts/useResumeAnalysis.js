import { useContext } from "react";
import { ResumeAnalysisContext } from "./resumeAnalysisStore";

export function useResumeAnalysis() {
  const context = useContext(ResumeAnalysisContext);
  if (!context) throw new Error("useResumeAnalysis must be used inside ResumeAnalysisProvider");
  return context;
}
