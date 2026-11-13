
import LegalDocument from "../../components/LegalDocument";
import { useStyle } from "../../components/ui/Style";
import { legalDocuments } from "../../lib/legalDocuments";

function PrivacyPage() {
  const style = useStyle();

  return (
    <section className={`min-h-screen px-6 pb-20 pt-36 ${style.primaryBg}`}>
      <article className="mx-auto max-w-4xl">
        <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Legal
        </span>
        <div className="mt-4">
          <LegalDocument
            document={legalDocuments.privacy}
            style={style}
            titleLevel="h1"
          />
        </div>
      </article>
    </section>
  );
}

export default PrivacyPage;
