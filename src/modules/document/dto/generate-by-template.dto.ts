import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateByTemplateDto {
  @IsString()
  @IsNotEmpty()
  documentContent: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;
}

export class GenerateByTemplateResponseDto {
  formattedDocument: string;
}
