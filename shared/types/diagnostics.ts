import type { SyncableDTO } from './common';

export const DIAGNOSTIC_SEVERITIES = [
  'info',
  'warning',
  'critical',
  'unknown',
] as const;
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export const DIAGNOSTIC_SOURCES = ['manual', 'vehicle', 'mock'] as const;
export type DiagnosticSource = (typeof DIAGNOSTIC_SOURCES)[number];

/**
 * A fault code. Codes are never invented by the app: they are either typed
 * in by the rider (`manual`) or decoded from a verified vehicle protocol.
 */
export interface DiagnosticRecordDTO extends SyncableDTO {
  scooterId: string;
  code: string;
  description: string;
  severity: DiagnosticSeverity;
  timestamp: string;
  source: DiagnosticSource;
  verified: boolean;
  notes: string | null;
}
