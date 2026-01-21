import { Body, Controller, Post, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
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
    return this.documentService.analyzeDocument(analyzeDocumentDto);
  }

  @Post('generate-by-template')
  async generateDocumentByTemplate(
    @Body() generateByTemplateDto: GenerateByTemplateDto,
  ): Promise<GenerateByTemplateResponseDto> {
    return this.documentService.generateDocumentByTemplate(
      generateByTemplateDto,
    );
  }

  @Post('generate-by-template-docx')
  async generateDocumentByTemplateDocx(
    @Body() generateByTemplateDto: GenerateByTemplateDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.documentService.generateDocumentByTemplateDocx(
        generateByTemplateDto,
      );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return new StreamableFile(buffer);
  }
}
