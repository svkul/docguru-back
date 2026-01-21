import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AnalyzeDocumentResponseDto } from './dto/analyze-document.dto';
import { OpenAiService } from '../openai/openai.service';
import { ClaudeService } from '../openai/claude.service';
import { GeminiService } from '../openai/gemini.service';
import { GenerateByTemplateResponseDto } from './dto/generate-by-template.dto';
import { AnalyzeDocumentDto } from './dto/analyze-document.dto';
import { GenerateByTemplateDto } from './dto/generate-by-template.dto';
import { textToDocxBuffer } from '../../utils/docx-generator';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly openAiService: OpenAiService,
    private readonly claudeService: ClaudeService,
    private readonly geminiService: GeminiService,
  ) {}

  private coerceProviderError(
    error: unknown,
    provider: string,
  ): {
    status: number;
    message: string;
  } {
    const err = error as {
      status?: unknown;
      message?: unknown;
      error?: unknown;
    };

    // Prefer explicit upstream HTTP status if present (OpenAI/Anthropic/Gemini SDKs expose it).
    const statusFromSdk =
      typeof err?.status === 'number' && err.status >= 400 && err.status <= 599
        ? err.status
        : null;

    // Prefer nested structured error messages when available.
    // OpenAI SDK: err.error?.message
    // Anthropic SDK: err.error?.error?.message
    const nested = err?.error as
      | { message?: unknown; error?: { message?: unknown } }
      | undefined;

    const nestedMessage =
      (typeof nested?.message === 'string' && nested.message) ||
      (typeof nested?.error?.message === 'string' && nested.error.message) ||
      null;

    const message =
      nestedMessage ||
      (typeof err?.message === 'string' && err.message) ||
      `Provider request failed: ${provider}`;

    // Fallback: infer status from message when SDK didn't expose it.
    let status = statusFromSdk ?? HttpStatus.INTERNAL_SERVER_ERROR;
    if (!statusFromSdk) {
      if (
        message.includes('overloaded') ||
        message.includes('503') ||
        message.includes('UNAVAILABLE')
      ) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
      } else if (
        message.includes('401') ||
        message.toLowerCase().includes('unauthorized')
      ) {
        status = HttpStatus.UNAUTHORIZED;
      } else if (message.includes('429') || message.includes('rate limit')) {
        status = HttpStatus.TOO_MANY_REQUESTS;
      } else if (message.includes('400')) {
        status = HttpStatus.BAD_REQUEST;
      }
    }

    return { status, message };
  }

  private resolveProvider(
    aiProvider?: 'openai' | 'claude' | 'gemini',
  ): 'openai' | 'claude' | 'gemini' {
    if (
      aiProvider === 'openai' ||
      aiProvider === 'claude' ||
      aiProvider === 'gemini'
    ) {
      return aiProvider;
    }
    return 'gemini';
  }

  /**
   * Analyzes document content and returns list of suitable journals
   * @param documentContent - The content of the document to analyze
   * @returns List of journals where the document can be published
   */
  async analyzeDocument(
    analyzeDocumentDto: AnalyzeDocumentDto,
  ): Promise<AnalyzeDocumentResponseDto> {
    const { documentContent, aiProvider } = analyzeDocumentDto;
    const provider = this.resolveProvider(aiProvider);

    try {
      if (provider === 'openai') {
        const journals =
          await this.openAiService.recommendJournals(documentContent);
        return { journals };
      }

      if (provider === 'claude') {
        const journals =
          await this.claudeService.recommendJournals(documentContent);
        return { journals };
      }

      // gemini (default)
      const journals =
        await this.geminiService.recommendJournals(documentContent);
      return { journals };
    } catch (error) {
      this.logger.error(
        `Failed to analyze document with ${provider}`,
        error as Error,
      );
      const { status, message } = this.coerceProviderError(error, provider);
      throw new HttpException(
        {
          message,
          provider,
        },
        status,
      );
    }
  }

  /**
   * Formats document according to selected journal template
   * @param documentContent - The original document content
   * @param templateId - The ID of the template to apply
   * @returns Formatted document content
   */
  async generateDocumentByTemplate(
    generateByTemplateDto: GenerateByTemplateDto,
  ): Promise<GenerateByTemplateResponseDto> {
    const { documentContent, templateId, aiProvider } = generateByTemplateDto;
    const provider = this.resolveProvider(aiProvider);

    try {
      if (provider === 'openai') {
        const structured = await this.openAiService.formatArticleForTemplate(
          templateId,
          documentContent,
        );
        return { formattedDocument: JSON.stringify(structured, null, 2) };
      }

      if (provider === 'claude') {
        const structured = await this.claudeService.formatArticleForTemplate(
          templateId,
          documentContent,
        );
        return { formattedDocument: JSON.stringify(structured, null, 2) };
      }

      const structured = await this.geminiService.formatArticleForTemplate(
        templateId,
        documentContent,
      );
      return { formattedDocument: JSON.stringify(structured, null, 2) };
    } catch (error) {
      this.logger.error(
        `Failed to generate document with ${provider}`,
        error as Error,
      );
      const { status, message } = this.coerceProviderError(error, provider);
      throw new HttpException(
        {
          message,
          provider,
        },
        status,
      );
    }
  }

  async generateDocumentByTemplateDocx(
    generateByTemplateDto: GenerateByTemplateDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const { documentContent, templateId, aiProvider } = generateByTemplateDto;
    const provider = this.resolveProvider(aiProvider);

    let updatedText = documentContent;
    const extractUpdatedArticleText = (value: unknown): string | null => {
      if (
        typeof value === 'object' &&
        value !== null &&
        'updatedArticleText' in value &&
        typeof (value as { updatedArticleText?: unknown })
          .updatedArticleText === 'string'
      ) {
        return (value as { updatedArticleText: string }).updatedArticleText;
      }
      return null;
    };

    try {
      if (provider === 'openai') {
        const structured = await this.openAiService.formatArticleForTemplate(
          templateId,
          documentContent,
        );
        updatedText =
          extractUpdatedArticleText(structured) ??
          JSON.stringify(structured, null, 2);
      } else if (provider === 'claude') {
        const structured = await this.claudeService.formatArticleForTemplate(
          templateId,
          documentContent,
        );
        updatedText =
          extractUpdatedArticleText(structured) ??
          JSON.stringify(structured, null, 2);
      } else {
        const structured = await this.geminiService.formatArticleForTemplate(
          templateId,
          documentContent,
        );
        updatedText = structured.updatedArticleText ?? documentContent;
      }

      const buffer = await textToDocxBuffer(updatedText);
      return { buffer, fileName: 'formatted.docx' };
    } catch (error) {
      this.logger.error(
        `Failed to generate DOCX with ${provider}`,
        error as Error,
      );
      const { status, message } = this.coerceProviderError(error, provider);
      throw new HttpException(
        {
          message,
          provider,
        },
        status,
      );
    }
  }
}
