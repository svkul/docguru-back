import * as Joi from 'joi';

export const configSchema = () => ({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,

  // Database
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
});

export const configValidationSchema = Joi.object({
  PORT: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production').required(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),

  // Anthropic
  ANTHROPIC_API_KEY: Joi.string().required(),

  // Gemini
  GEMINI_API_KEY: Joi.string().required(),
});
