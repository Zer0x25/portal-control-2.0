export interface NoteListParams {
  since?: string;
}
export interface NoteInput {
  content: string;
  authorUsername: string;
  color?: string;
  reminderEnabled?: boolean;
}
export interface NoteDependencies<Note, Archived> {
  list(params: NoteListParams): Promise<Note[]>;
  parse(value: unknown): NoteInput;
  create(value: NoteInput): Promise<Note>;
  archive(id: string): Promise<Archived>;
  remove(id: string): Promise<unknown>;
}
