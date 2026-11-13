function LegalDocument({ document, style, titleLevel = "h2" }) {
  const Title = titleLevel;
  const titleSize = titleLevel === "h1" ? "mt-4 text-4xl" : "mt-2 text-2xl";

  return (
    <article>
      <Title className={`${titleSize} font-bold ${style.headingText}`}>
        {document.title}
      </Title>
      <p className={`mt-2 text-sm ${style.tertiaryText}`}>
        <strong>Effective Date:</strong> {document.effectiveDate}
      </p>

      <div className={`mt-6 space-y-4 leading-7 ${style.secondaryText}`}>
        {document.introduction.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h3 className={`text-lg font-bold ${style.headingText}`}>
              {section.heading}
            </h3>
            <div className={`mt-3 space-y-4 leading-7 ${style.secondaryText}`}>
              {section.blocks.map((block, index) => {
                if (block.type === "list") {
                  return (
                    <ul
                      key={`${section.heading}-${index}`}
                      className="list-disc space-y-2 pl-6"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                if (block.type === "label") {
                  return (
                    <p
                      key={`${section.heading}-${index}`}
                      className={`font-semibold ${style.primaryText}`}
                    >
                      {block.text}
                    </p>
                  );
                }
                return (
                  <p key={`${section.heading}-${index}`}>{block.text}</p>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className={`mt-8 font-semibold ${style.headingText}`}>
        {document.closing}
      </p>
    </article>
  );
}

export default LegalDocument;
