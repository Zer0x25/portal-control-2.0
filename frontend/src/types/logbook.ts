import { Syncable } from "./common";

export interface LogbookEntryItem {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
  recordId?: string;
}

export interface SupplierEntry {
  id: string;
  entryType?: "visit" | "provider";
  arrivalMode?: "pedestrian" | "vehicle";
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
  removedLogEntryIds?: string[];
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
