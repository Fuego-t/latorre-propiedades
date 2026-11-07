export interface SeoBuildInput {
  template: string;
  properties: Array<any>;
  redirects?: Array<{ source: string; destination: string; type: number }>;
  origin?: string;
}
export interface SeoBuildOutput {
  files: Record<string, string>;
  redirects: Array<{ source: string; destination: string; type: number }>;
}
export function buildSeoFiles(input: SeoBuildInput): SeoBuildOutput;
export function propertySeo(property: any, origin?: string): Record<string, any>;
export const ORIGIN: string;
export const BRANDSEN_PATH: string;
