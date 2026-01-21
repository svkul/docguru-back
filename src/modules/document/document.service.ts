import { Injectable } from '@nestjs/common';
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
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly claudeService: ClaudeService,
    private readonly geminiService: GeminiService,
  ) {}

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
  }
}
