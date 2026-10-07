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
  time(): Time;
  closure(date: string): Promise<Closure>;
  download(meta: Record<string, unknown>): Promise<PolicyDownload | null>;
  removeFile(filename: string): Promise<void>;
  now(): string;
}
