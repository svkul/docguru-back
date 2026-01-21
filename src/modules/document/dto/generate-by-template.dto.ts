import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class GenerateByTemplateDto {
  @IsString()
  @IsNotEmpty()
  documentContent: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsOptional()
  @IsString()
  @IsIn(['openai', 'claude', 'gemini'])
  aiProvider?: 'openai' | 'claude' | 'gemini';
}

export class GenerateByTemplateResponseDto {
  formattedDocument: string;
}
