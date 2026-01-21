import { Injectable } from '@nestjs/common';
import { AnalyzeDocumentResponseDto } from './dto/analyze-document.dto';
import { OpenAiService } from '../openai/openai.service';
import { GenerateByTemplateResponseDto } from './dto/generate-by-template.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly openAiService: OpenAiService) {}

  /**
   * Analyzes document content and returns list of suitable journals
   * @param documentContent - The content of the document to analyze
   * @returns List of journals where the document can be published
   */
  async analyzeDocument(
    documentContent: string,
  ): Promise<AnalyzeDocumentResponseDto> {
    const journals =
      await this.openAiService.recommendJournals(documentContent);

    return { journals };
  }

  /**
   * Formats document according to selected journal template
   * @param documentContent - The original document content
   * @param templateId - The ID of the template to apply
   * @returns Formatted document content
   */
  async generateDocumentByTemplate(
    documentContent: string,
    templateId: string,
  ): Promise<GenerateByTemplateResponseDto> {
    const structured = await this.openAiService.formatArticleForTemplate(
      templateId,
      documentContent,
    );

    const formattedDocument = [
      structured.title?.trim() ? structured.title.trim() : 'Untitled',
      '',
      ...structured.sections.flatMap((section) => [
        section.heading?.trim() ? section.heading.trim() : 'Section',
        section.content?.trim() ? section.content.trim() : '',
        '',
      ]),
    ]
      .join('\n')
      .trim();

    return { formattedDocument };
  }
}
