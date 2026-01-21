import { Controller, Post, Body } from '@nestjs/common';
import { DocumentService } from './document.service';
import { AnalyzeDocumentDto } from './dto/analyze-document.dto';
import { AnalyzeDocumentResponseDto } from './dto/analyze-document.dto';
import { GenerateByTemplateDto } from './dto/generate-by-template.dto';
import { GenerateByTemplateResponseDto } from './dto/generate-by-template.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('analyze')
  async analyzeDocument(
    @Body() analyzeDocumentDto: AnalyzeDocumentDto,
  ): Promise<AnalyzeDocumentResponseDto> {
    return this.documentService.analyzeDocument(
      analyzeDocumentDto.documentContent,
    );
  }

  @Post('generate-by-template')
  async generateDocumentByTemplate(
    @Body() generateByTemplateDto: GenerateByTemplateDto,
  ): Promise<GenerateByTemplateResponseDto> {
    return this.documentService.generateDocumentByTemplate(
      generateByTemplateDto.documentContent,
      generateByTemplateDto.templateId,
    );
  }
}
