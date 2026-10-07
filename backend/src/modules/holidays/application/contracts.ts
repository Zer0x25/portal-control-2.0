export interface HolidayRecord {
  id: string;
  date: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HolidayOptions {
  since?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  showArchived?: boolean;
}

export interface HolidayFilter {
  updatedSince?: Date;
  dateFrom?: string;
  search?: string;
}

export interface HolidayQuery extends HolidayFilter {
  offset?: number;
  limit?: number;
}

export interface HolidayView extends HolidayRecord {
  lastModified: number;
  syncStatus: "synced";
  isDeleted: false;
}

export type HolidayResult =
  | HolidayView[]
  | {
      data: HolidayView[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    };

export interface HolidayRepository {
  list(query: HolidayQuery): Promise<HolidayRecord[]>;
  count(filter: HolidayFilter): Promise<number>;
  countYear(year: number): Promise<number>;
}

export interface HolidayDependencies {
  repository: HolidayRepository;
  clock: { businessDate(): string; year(): number };
  autosyncEnabled(): boolean;
  sync(year: number): Promise<unknown>;
  onAutosync?(year: number): void;
  onAutosyncDisabled?(): void;
}

export type GetHolidays = (options?: HolidayOptions) => Promise<HolidayResult>;
