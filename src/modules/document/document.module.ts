import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { OpenAiService } from '../openai/openai.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, OpenAiService],
})
export class DocumentModule {}
