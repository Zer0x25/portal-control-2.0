export interface NoteListParams {
  since?: string | number;
}
export interface NoteInput {
  content: string;
  authorUsername: string;
  color?: string;
  reminderEnabled?: boolean;
}
export interface NoteDependencies<Note, Archived> {
  parseQuery(value: unknown): NoteListParams;
  list(params: NoteListParams): Promise<Note[]>;
  parse(value: unknown): NoteInput;
  create(value: NoteInput, actorUsername: string): Promise<Note>;
  archive(id: string, actorUsername: string): Promise<Archived>;
  remove(id: string, actorUsername: string): Promise<unknown>;
}
