import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

import { Journal } from '../document/dto/analyze-document.dto';

const JournalSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string(),
  description: z.string(),
  templateId: z.string(),
});

const JournalsResponseSchema = z.object({
  journals: z.array(JournalSchema),
});

const FormattedArticleSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
    }),
  ),
});

const JOURNAL_GUIDELINES: Record<string, string> = {
  /**
   * TODO: Replace these placeholders with real journal requirements.
   * Keys are templateIds (journal identifiers) coming from the client.
   */
  'template-1':
    'Use an IMRaD structure. Keep language formal and concise. Add clear headings.',
  'template-2':
    'Use a structured abstract, then IMRaD. Ensure consistent terminology and citations.',
};

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  /**
   * Ask OpenAI to recommend journals for the provided text.
   * Uses structured outputs to guarantee a valid JSON array.
   */
  async recommendJournals(text: string): Promise<Journal[]> {
    try {
      const response = await this.client.responses.parse({
        model: 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'You are an academic publishing assistant.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `
                  Given the article text, recommend 3 journals.
                  Return STRICT JSON:
                  {
                    "journals": [
                      { "id": "1", "name": "Journal name", "reason": "why", "description": "A leading journal for scientific research", "templateId": "template-1" }
                    ]
                  }

                  TEXT:
                  ${text.slice(0, 6000)}
                `,
              },
            ],
          },
        ],
        text: {
          // Structured output ensures valid JSON that matches the schema
          format: zodTextFormat(JournalsResponseSchema, 'journals'),
        },
      });

      return response.output_parsed?.journals ?? [];
    } catch (error) {
      this.logger.error(
        'Failed to get journal recommendations from OpenAI',
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Format the article for a specific journal/template and return a structured result.
   * Uses structured outputs to guarantee valid JSON.
   */
  async formatArticleForTemplate(
    templateId: string,
    articleText: string,
  ): Promise<z.infer<typeof FormattedArticleSchema>> {
    const guidelines =
      JOURNAL_GUIDELINES[templateId] ??
      'Follow common academic publishing standards.';

    try {
      const response = await this.client.responses.parse({
        model: 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'You are a scientific editor.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `
                  Format the article for the journal below.

                  Return STRICT JSON:
                  {
                    "title": "...",
                    "sections": [
                      { "heading": "Introduction", "content": "..." }
                    ]
                  }

                  Journal: ${templateId}
                  Guidelines: ${guidelines}

                  ARTICLE:
                  ${articleText.slice(0, 12000)}
                `,
              },
            ],
          },
        ],
        text: {
          // Structured output ensures valid JSON that matches the schema
          format: zodTextFormat(FormattedArticleSchema, 'formatted_article'),
        },
      });

      return (
        response.output_parsed ?? {
          title: '',
          sections: [],
        }
      );
    } catch (error) {
      this.logger.error('Failed to format article with OpenAI', error as Error);
      throw error;
    }
  }
}
