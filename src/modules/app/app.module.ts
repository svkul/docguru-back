import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentModule } from '../document/document.module';
import { configSchema, configValidationSchema } from '../../config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configSchema],
      isGlobal: true,
      expandVariables: true,
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    DocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
