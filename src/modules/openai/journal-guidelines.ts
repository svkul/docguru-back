export const JOURNAL_GUIDELINES: Record<string, string> = {
  'Ca-A Cancer Journal for Clinicians': `CA: A Cancer Journal for Clinicians - Author Guidelines

    JOURNAL FOCUS:
    - Comprehensive multidisciplinary reviews
    - American Cancer Society (ACS) guidelines
    - "Cancer Statistics" articles
    - Target audience: oncologists, primary care providers, and public health professionals
    - All manuscripts must be written in an accessible, non-specialized style

    SUBMISSION REQUIREMENTS:
    - Most articles are solicited
    - Original research (excluding ACS statistics), Case Reports, and Letters to the Editor are generally not accepted
    - All unsolicited manuscripts must receive editorial approval before submission
    - Pre-submission inquiry required: email ca.edoff@cancer.org with outline, abstract, full author list, and manuscript length
    - Formal submissions via ScholarOne Manuscripts in .DOC, .DOCX, or .RTF formats
    - Review article length: typically 25 to 40 double-spaced pages

    CONTENT AND LANGUAGE STANDARDS:
    - Use patient-centric language that avoids associating gender with cancer (e.g., "people with breast cancer" not "women with breast cancer")
    - Avoid labeling people by their disease (e.g., "patients with cancer" not "cancer patients")
    - Recommendations should be clear and direct (e.g., "we suggest/recommend" rather than "consider")
    - Authors are encouraged to include individuals with lived experience of the disease as authors where appropriate
    - Articles written with industry assistance will not be considered

    PUBLICATION FEES AND OPEN ACCESS:
    - No submission fees or page charges
    - Journal is Open Access
    - Standard Article Publication Charge (APC): $4,330 USD
    - Articles published under CC-BY-NC-ND license are currently free of charge
    - Authors must provide documentation for any figures or tables reproduced from other sources
    - Patient consent forms required where necessary
  `,
};

export const getGuidelines = (templateId: string): string =>
  JOURNAL_GUIDELINES[templateId] ??
  'Follow common academic publishing standards.';
