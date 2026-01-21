import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { Journal } from '../document/dto/analyze-document.dto';
import { getGuidelines } from './journal-guidelines';

const ClaudeMessageSchema = z.object({
  content: z.array(z.object({ type: z.string() }).passthrough()),
});

const ClaudeJournalsResponseSchema = z.object({
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

const ClaudeFormatResponseSchema = z.object({
  titleChanges: z.string(),
  abstractChanges: z.string(),
  structureChanges: z.array(z.string()),
  citationStyle: z.string(),
  formattingRules: z.array(z.string()),
  wordCount: z.object({
    current: z.number(),
    required: z.number(),
    action: z.string(),
  }),
});

export type ClaudeFormatResponse = z.infer<typeof ClaudeFormatResponseSchema>;

type AnthropicClient = {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      temperature?: number;
      messages: { role: 'user' | 'assistant'; content: string }[];
    }) => Promise<unknown>;
  };
};

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: AnthropicClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.client = new Anthropic({ apiKey }) as unknown as AnthropicClient;
  }

  private extractTextContent(message: unknown): string {
    const parsed = ClaudeMessageSchema.safeParse(message);
    if (!parsed.success) {
      return '';
    }

    const textBlock = parsed.data.content.find(
      (block) => block.type === 'text' && typeof block.text === 'string',
    ) as { text?: unknown } | undefined;

    const text = textBlock?.text;
    return typeof text === 'string' ? text.trim() : '';
  }

  /**
   * Recommend journals using Claude. Throws error on API failure.
   */
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
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = this.extractTextContent(message);

      if (!raw) {
        this.logger.warn('Claude returned empty response');
        return [];
      }

      const parsed = ClaudeJournalsResponseSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data.journals : [];
    } catch (error) {
      const err = error as Error & { message?: string; status?: number };
      this.logger.error(
        'Failed to get journal recommendations from Claude',
        err,
      );

      // Extract error message from API error
      const errorMessage =
        err.message || 'Failed to get journal recommendations from Claude';
      throw new Error(`Claude API error: ${errorMessage}`);
    }
  }

  /**
   * Format article for a journal using Claude. Throws error on API failure.
   */
  async formatArticleForTemplate(
    templateId: string,
    articleText: string,
  ): Promise<ClaudeFormatResponse> {
    const guidelines = getGuidelines(templateId);

    const prompt = `
You are a scientific editor.

Analyze this article against the journal's formatting guidelines and return ONLY a JSON object (no markdown, no explanation) with the required changes.

Article:
${articleText.slice(0, 12000)}

Journal Guidelines:
${guidelines}

Return a JSON object with this structure:
{
  "titleChanges": "description of title formatting changes needed",
  "abstractChanges": "description of abstract changes needed",
  "structureChanges": ["list", "of", "structural", "changes"],
  "citationStyle": "required citation style",
  "formattingRules": ["specific", "formatting", "requirements"],
  "wordCount": {
    "current": 5000,
    "required": 4000,
    "action": "reduce by 1000 words"
  }
}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = this.extractTextContent(message);

      if (!raw) {
        return {
          titleChanges: '',
          abstractChanges: '',
          structureChanges: [],
          citationStyle: '',
          formattingRules: [],
          wordCount: { current: 0, required: 0, action: '' },
        };
      }

      const parsed = ClaudeFormatResponseSchema.safeParse(JSON.parse(raw));
      return parsed.success
        ? parsed.data
        : {
            titleChanges: '',
            abstractChanges: '',
            structureChanges: [],
            citationStyle: '',
            formattingRules: [],
            wordCount: { current: 0, required: 0, action: '' },
          };
    } catch (error) {
      const err = error as Error & { message?: string; status?: number };
      this.logger.error('Failed to format article with Claude', err);

      // Extract error message from API error
      const errorMessage =
        err.message || 'Failed to format article with Claude';
      throw new Error(`Claude API error: ${errorMessage}`);
    }
  }
}
