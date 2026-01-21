import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { OpenAiService } from '../openai/openai.service';
import { ClaudeService } from '../openai/claude.service';
import { GeminiService } from '../openai/gemini.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, OpenAiService, ClaudeService, GeminiService],
})
export class DocumentModule {}
