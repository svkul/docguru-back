import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * Converts plain text to a DOCX document Buffer.
 * This is intentionally simple: it preserves paragraph breaks and lines.
 */
export async function textToDocxBuffer(text: string): Promise<Buffer> {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraphText) => {
      const lines = paragraphText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const children =
        lines.length > 0
          ? lines.map(
              (line, idx) =>
                new TextRun({ text: line, break: idx === 0 ? 0 : 1 }),
            )
          : [new TextRun({ text: paragraphText })];

      return new Paragraph({
        children,
        spacing: { after: 200 },
      });
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children:
          paragraphs.length > 0
            ? paragraphs
            : [
                new Paragraph({
                  children: [new TextRun({ text: text ?? '' })],
                }),
              ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
