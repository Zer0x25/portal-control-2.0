export interface PolicyFile {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}
export interface PolicyDownload {
  path: string;
  originalName: string;
}
export interface ConfigDependencies<Time, Closure> {
  get(key: string, role?: string): Promise<unknown>;
  list(role?: string): Promise<{ key: string; value: unknown }[]>;
  set(key: string, value: unknown, actor: string): Promise<unknown>;
  replacePolicy(value: unknown, actor: string): Promise<unknown>;
  validateFile(file: PolicyFile): Promise<void>;
  download(meta: Record<string, unknown>): Promise<PolicyDownload | null>;
  removeFile(filename: string): Promise<void>;
  validateLogoFile(file: PolicyFile): Promise<void>;
  downloadLogo(meta: Record<string, unknown>): Promise<PolicyDownload | null>;
  removeLogoFile(filename: string): Promise<void>;
  time(): Time;
  closure(date: string): Promise<Closure>;
  now(): string;
}
