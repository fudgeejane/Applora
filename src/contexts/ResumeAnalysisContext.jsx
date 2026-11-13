import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { ResumeAnalysisContext } from "./resumeAnalysisStore";

export function ResumeAnalysisProvider({ children }) {
  const [analyses, setAnalyses] = useState({});
  const [errors, setErrors] = useState({});
  const [analyzingResumeId, setAnalyzingResumeId] = useState("");

  const analyzeResume = useCallback(async (resume, setResumes) => {
    if (!resume || analyzingResumeId) return;
    setAnalyzingResumeId(resume.id);
    setErrors((current) => ({ ...current, [resume.id]: "" }));
    setAnalyses((current) => {
      const next = { ...current };
      delete next[resume.id];
      return next;
    });

    try {
      const response = await api.post(
        `/resumes/${encodeURIComponent(resume.id)}/analyze`,
        { consent: true },
      );
      const analysis = response.data.analysis;
      setAnalyses((current) => ({ ...current, [resume.id]: analysis }));
      const identifiedOccupation = analysis.occupation?.primary?.trim();
      if (!resume.occupation && identifiedOccupation) {
        try {
          const updateResponse = await api.patch(
            `/resumes/${encodeURIComponent(resume.id)}`,
            { occupation: identifiedOccupation },
          );
          const updatedResume = updateResponse.data.resume;
          setResumes((current) => current.map((item) => (
            item.id === updatedResume.id ? updatedResume : item
          )));
        } catch (error) {
          toast.error(
            error.response?.data?.message
              || "The occupation was identified but could not be saved to this resume.",
          );
        }
      }
    } catch (error) {
      const responseData = error.response?.data;
      const message = responseData?.message || "Unable to analyze this resume. Please try again.";
      setErrors((current) => ({
        ...current,
        [resume.id]: responseData?.code ? `${message} (Code: ${responseData.code})` : message,
      }));
    } finally {
      setAnalyzingResumeId("");
    }
  }, [analyzingResumeId]);

  const value = useMemo(() => ({
    analyses,
    errors,
    analyzingResumeId,
    analyzeResume,
  }), [analyses, errors, analyzingResumeId, analyzeResume]);

  return (
    <ResumeAnalysisContext.Provider value={value}>
      {children}
    </ResumeAnalysisContext.Provider>
  );
}
