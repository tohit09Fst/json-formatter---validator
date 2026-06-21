/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PresetSample {
  name: string;
  description: string;
  data: string;
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  charIndex?: number;
  snippet?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  size: number;
  content: string;
}

export type ViewMode = 'formatted' | 'tree' | 'diff' | 'convert';

export type IndentStyle = '2' | '4' | 'tabs' | 'minify';

export type ExportFormat = 'yaml' | 'xml' | 'csv' | 'tsv';

export interface ThemeConfig {
  id: string;
  name: string;
  bg: string;
  sidebarBg: string;
  cardBg: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  buttonActiveBg: string;
}
