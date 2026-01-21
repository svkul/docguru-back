import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeDocumentDto {
  @IsString()
  @IsNotEmpty()
  documentContent: string;
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
