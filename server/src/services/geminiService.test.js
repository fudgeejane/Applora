import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiService, GeminiServiceError } from "./geminiService.js";

const validAnalysis = {
  occupation: { primary: "Product Designer", alternatives: [] },
  atsCompatibility: { score: 82, explanation: "Clear sections and relevant terms.", improvements: ["Add outcome metrics"] },
  professionalSummary: { assessment: "Clear but could be more specific.", improved: "Product designer with experience building accessible products." },
  workExperience: { assessment: "Responsibilities are clear.", rewrittenExamples: ["Improved onboarding flow using supported evidence."] },
  skills: { assessment: "Relevant skills are visible.", technical: ["Figma"], soft: ["Collaboration"], recommendedKeywords: ["Design systems"] },
  educationAssessment: "Education is presented clearly.",
  formattingAssessment: "Standard headings make the resume easy to scan.",
  grammarIssues: ["Use consistent punctuation in bullet points."],
  strengths: ["Relevant project experience"],
  areasForImprovement: ["Add outcome metrics where available."],
  recommendations: ["Use a consistent date format."],
  optimizedResume: "Jordan Lee\nPROFESSIONAL SUMMARY\nProduct designer...",
  limitations: ["The document does not show education dates."],
};

function fakeService(response) {
  const calls = [];
  const service = createGeminiService({
    env: { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "test-model", GEMINI_PAID_SERVICE: "true" },
    clientFactory: (apiKey) => {
      assert.equal(apiKey, "test-key");
      return {
        interactions: {
          async create(params, requestOptions) {
            calls.push({ params, requestOptions });
            return typeof response === "function" ? response(params) : response;
          },
        },
      };
    },
  });
  return { service, calls };
}

test("chat uses the configured model, stateless interactions, and bounded generation", async () => {
  const { service, calls } = fakeService({ output_text: "  Here are three practical steps.  " });

  const reply = await service.chat({
    message: "How do I prepare?",
    history: [{ role: "user", text: "I have an interview." }],
  });

  assert.equal(reply, "Here are three practical steps.");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].params.model, "test-model");
  assert.equal(calls[0].params.store, false);
  assert.equal(calls[0].requestOptions.timeout, 30_000);
  assert.equal("httpOptions" in calls[0].params, false);
  assert.match(calls[0].params.input, /User: I have an interview\./);
  assert.match(calls[0].params.input, /User: How do I prepare\?/);
});

test("chat reports a missing API key without attempting a provider request", async () => {
  const service = createGeminiService({ env: {}, clientFactory: () => assert.fail("client should not be created") });

  await assert.rejects(service.chat({ message: "Hello", history: [] }), {
    name: "GeminiServiceError",
    statusCode: 503,
  });
});

test("resume analysis is allowed when a Gemini API key is configured", async () => {
  const { service } = fakeService({ output_text: JSON.stringify(validAnalysis) });

  const result = await service.analyzeResume({ resumeText: "Readable resume text." });

  assert.deepEqual(result, validAnalysis);
});

test("resume analysis sends extracted text and validates structured output", async () => {
  const { service, calls } = fakeService({ output_text: JSON.stringify(validAnalysis) });
  const resumeText = "Jordan Lee\nProduct designer\nFigma, collaboration";

  const result = await service.analyzeResume({ resumeText, targetRole: "Designer" });

  assert.deepEqual(result, validAnalysis);
  assert.equal(calls[0].params.store, false);
  assert.equal(calls[0].params.response_format.mime_type, "application/json");
  assert.equal(calls[0].params.generation_config.max_output_tokens, 6000);
  assert.match(calls[0].params.system_instruction, /Do not use 85 or any other fixed or default score/);
  assert.match(calls[0].params.system_instruction, /keyword and target-role alignment 0-25/);
  assert.match(calls[0].params.input, /Target role: Designer/);
  assert.match(calls[0].params.input, /Jordan Lee/);
});

test("resume analysis rejects unreadable text and malformed model output", async () => {
  const { service } = fakeService({ output_text: JSON.stringify({ summary: "Only a summary." }) });

  await assert.rejects(
    service.analyzeResume({ resumeText: " " }),
    { name: "GeminiServiceError", statusCode: 400 },
  );
  await assert.rejects(
    service.analyzeResume({ resumeText: "A readable resume." }),
    { name: "GeminiServiceError", statusCode: 502 },
  );
});

test("resume analysis rejects an ATS score outside the supported range", async () => {
  const invalidAnalysis = { ...validAnalysis, atsCompatibility: { ...validAnalysis.atsCompatibility, score: 101 } };
  const { service } = fakeService({ output_text: JSON.stringify(invalidAnalysis) });
  await assert.rejects(
    service.analyzeResume({ resumeText: "A readable resume." }),
    { name: "GeminiServiceError", statusCode: 502, diagnosticCode: "invalid-analysis-score" },
  );
});

test("provider throttling becomes a safe retryable service error", async () => {
  const { service } = fakeService(() => {
    const error = new Error("provider details");
    error.status = 429;
    throw error;
  });

  await assert.rejects(
    service.chat({ message: "Hello", history: [] }),
    (error) => error instanceof GeminiServiceError
      && error.statusCode === 503
      && error.diagnosticCode === "provider-429"
      && !error.publicMessage.includes("provider details"),
  );
});
