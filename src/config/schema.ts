/**
 * Zod schemas for configuration validation.
 */

import { z } from 'zod';
import { DEFAULT_CONFIG } from './types';

/**
 * Authentication type schema.
 */
export const AuthTypeSchema = z.enum(['password', 'key']);

/**
 * Session configuration schema.
 */
export const SessionConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  authType: AuthTypeSchema,
  privateKeyPath: z.string().optional(),
  lastUsed: z.string().optional(),
  group: z.string().optional(),
});

/**
 * Application configuration schema.
 */
export const AppConfigSchema = z.object({
  sessions: z.array(SessionConfigSchema).default([]),
  activeTheme: z.string().default(DEFAULT_CONFIG.activeTheme),
  downloadDir: z.string().default(DEFAULT_CONFIG.downloadDir),
  terminalFontSize: z.number().int().min(8).max(72).default(DEFAULT_CONFIG.terminalFontSize),
  terminalFontFamily: z.string().default(DEFAULT_CONFIG.terminalFontFamily),
});

/**
 * Validate and parse application configuration.
 * Returns the parsed config or the default config if validation fails.
 */
export function parseAppConfig(data: unknown): z.infer<typeof AppConfigSchema> {
  const result = AppConfigSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.error('Config validation failed:', result.error.issues);
  return { ...DEFAULT_CONFIG };
}

/**
 * Validate a single session config.
 */
export function validateSessionConfig(data: unknown): boolean {
  return SessionConfigSchema.safeParse(data).success;
}

/**
 * Validate an array of session configs.
 */
export function validateSessionConfigs(data: unknown): boolean {
  return z.array(SessionConfigSchema).safeParse(data).success;
}
