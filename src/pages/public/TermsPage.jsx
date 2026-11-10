
import { useStyle } from "../../components/ui/Style";

function TermsPage() {
  const style = useStyle();

  return (
    <section className={`min-h-screen px-6 pb-20 pt-36 ${style.primaryBg}`}>
      <article className="mx-auto max-w-4xl">
        <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Legal
        </span>

        <h1 className={`mt-4 text-4xl font-bold ${style.headingText}`}>
          Terms of Service
        </h1>

        <p className={`mt-4 ${style.secondaryText}`}>
          Last updated: November 2026
        </p>

        <div className={`mt-12 space-y-9 leading-8 ${style.secondaryText}`}>
          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Applora, you agree to comply
              with these Terms of Service. If you do not agree
              with these terms, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              2. Description of Service
            </h2>
            <p>
              Applora is a career management platform designed
              to help users organize job applications, resumes,
              interviews, and related career activities.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              3. User Responsibilities
            </h2>
            <p>
              Users are responsible for providing accurate
              information, maintaining account security, and
              using the platform appropriately.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              4. Account Security
            </h2>
            <p>
              Users must take reasonable steps to protect their
              account credentials. Any future account and
              authentication features will be subject to the
              platform's security policies.
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-bold ${style.headingText}`}>
              5. Changes to These Terms
            </h2>
            <p>
              Applora may update these terms as the platform
              develops. Updated terms will be published on
              this page.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}

export default TermsPage;
