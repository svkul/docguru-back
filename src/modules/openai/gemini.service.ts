import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { Journal } from '../document/dto/analyze-document.dto';
import { getGuidelines } from './journal-guidelines';

const JournalsSchema = z.object({
  journals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      reason: z.string(),
      description: z.string(),
      templateId: z.string(),
    }),
  ),
});

const UpdatedDocSchema = z.object({
  updatedArticleText: z.string(),
  changeSummary: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

type UpdatedDocResponse = z.infer<typeof UpdatedDocSchema>;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // New SDK (2026) uses GoogleGenAI client; model name from prompt above
    this.ai = new GoogleGenAI({ apiKey });
  }

  private parseJson<T>(raw: string, schema: z.ZodSchema<T>): T | null {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const safe = schema.safeParse(parsed);
      if (safe.success) {
        return safe.data;
      }
    } catch (e) {
      this.logger.warn('Failed to parse Gemini JSON response', e as Error);
    }
    return null;
  }

  async recommendJournals(text: string): Promise<Journal[]> {
    const prompt = `
Based on this research article, recommend 3 suitable academic journals for publication. Consider the article's topic, methodology, and scope.

Article text:
${text.slice(0, 6000)}

Return STRICT JSON only:
{
  "journals": [
    { "id": "1", "name": "Journal Name", "reason": "why it's suitable", "description": "short description", "templateId": "template-1" }
  ]
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const raw = response.text ?? '';

      if (!raw) {
        this.logger.warn('Gemini returned empty response');
        return [];
      }

      const parsed = this.parseJson(raw, JournalsSchema);
      return parsed?.journals ?? [];
    } catch (error) {
      const err = error as Error & {
        status?: number;
        error?: { message?: string; code?: number };
      };
      this.logger.error(
        'Failed to get journal recommendations from Gemini',
        err,
      );

      // Extract error message from API error
      const errorMessage =
        err.error?.message ||
        err.message ||
        'Failed to get journal recommendations from Gemini';
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  async formatArticleForTemplate(
    templateId: string,
    articleText: string,
  ): Promise<UpdatedDocResponse> {
    const guidelines = getGuidelines(templateId);

    const prompt = `
You are a journal formatting assistant. Rewrite the article to comply with the journal guidelines.
- Apply formatting, structure, and citation style rules from the guidelines.
- Do NOT invent sources, data, or claims. If information is missing, leave it as-is.
- Length: keep approximately the same; do not force word-count changes.
- Return STRICT JSON only, matching this schema (no markdown or extra text):
{
  "updatedArticleText": "full rewritten article text",
  "changeSummary": "short bullet-style summary of main changes (optional)",
  "warnings": ["issues or missing info you could not resolve (optional)"]
}

Article:
${articleText.slice(0, 12000)}

Journal Guidelines:
${guidelines}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const raw = response.text ?? '';

      const parsed = raw ? this.parseJson(raw, UpdatedDocSchema) : null;
      return (
        parsed ?? {
          updatedArticleText: articleText,
          changeSummary: 'No changes parsed from model response.',
          warnings: ['Model returned empty or invalid JSON.'],
        }
      );
    } catch (error) {
      const err = error as Error & {
        status?: number;
        error?: { message?: string; code?: number };
      };
      this.logger.error('Failed to format article with Gemini', err);

      // Extract error message from API error
      const errorMessage =
        err.error?.message ||
        err.message ||
        'Failed to format article with Gemini';
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }
}
