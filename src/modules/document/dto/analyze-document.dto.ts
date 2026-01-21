import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class AnalyzeDocumentDto {
  @IsString()
  @IsNotEmpty()
  documentContent: string;

  @IsOptional()
  @IsString()
  @IsIn(['openai', 'claude', 'gemini'])
  aiProvider?: 'openai' | 'claude' | 'gemini';
}

export class Journal {
  id: string;
  name: string;
  reason?: string;
  description?: string;
  templateId: string;
}

export class AnalyzeDocumentResponseDto {
  journals: Journal[];
}
