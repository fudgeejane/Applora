
import { useStyle } from "../../components/ui/Style";

function PrivacyPage() {
  const style = useStyle();

  return (
    <section className={`min-h-screen px-6 pb-20 pt-36 ${style.primaryBg}`}>
      <article className="mx-auto max-w-4xl">
        <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Legal
        </span>

        <h1 className={`mt-4 text-4xl font-bold ${style.headingText}`}>
          Privacy Policy
        </h1>

        <p className={`mt-4 ${style.secondaryText}`}>
          Last updated: November 2026
        </p>

        <div className={`mt-12 space-y-9 leading-8 ${style.secondaryText}`}>
          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              1. Introduction
            </h2>
            <p>
              This Privacy Policy explains how Applora intends
              to handle information when users access and use
              the platform.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              2. Information We May Collect
            </h2>
            <p>
              Information may include account details, profile
              information, resumes, job application records,
              and information submitted through platform forms.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              3. How Information May Be Used
            </h2>
            <p>
              Information may be used to provide platform
              features, manage career activities, improve
              functionality, and support account services.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              4. Data Security
            </h2>
            <p>
              Applora aims to use appropriate security measures
              to protect user information. Actual security
              practices must be implemented and verified before
              the platform is released.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              5. Policy Updates
            </h2>
            <p>
              This policy may be revised as Applora develops.
              Changes will be reflected on this page.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}

export default PrivacyPage;
