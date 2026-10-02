import { Syncable } from "./common";

export interface LogbookEntryItem {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
}

export interface SupplierEntry {
  id: string;
  time: string;
  licensePlate: string;
  driverName: string;
  paxCount: number;
  company: string;
  reason: string;
  timestamp: number;
}

export interface ShiftReport extends Syncable {
  id: string;
  folio: string;
  date: string;
  shiftName: string;
  responsibleUser: string;
  startTime: string;
  endTime?: string;
  status: "open" | "closed";
  logEntries: LogbookEntryItem[];
  supplierEntries: SupplierEntry[];
  reportCreatedAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface ShiftHandoverData {
  responsibleUser: string;
  endTime: string;
  logEntries: LogbookEntryItem[];
  automaticClosures: LogbookEntryItem[];
}
