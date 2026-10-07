import { createRecordFlows } from "../modules/records";
import { TimeRecordService } from "./TimeRecordService";
import { PunchService } from "./PunchService";
import { AuthService } from "./AuthService";
import { getChileDateISO } from "../utils/timeUtils";
import { requestContext } from "../utils/context";
import { auditService } from "./auditService";
import { SocketService } from "./socketService";
export const recordFlows = createRecordFlows({
  service: {
    isLocked: (date) => TimeRecordService.isRecordLocked(date),
    lastPunch: (id) => TimeRecordService.findLastPunch(id),
    linkedEmployee: (id) => AuthService.getUserById(id),
    punch: (user, id, source, type, latitude, longitude) =>
      PunchService.handlePunch({ user }, id, source, type, latitude, longitude),
    list: (query, user) => TimeRecordService.listRecords(query, user),
    save: (data, actor) => TimeRecordService.saveRecord(data, actor),
    enrich: (row) => TimeRecordService.enrichRecord(row),
    bulk: (data, actor) => TimeRecordService.createBulkRecords(data, actor),
    delete: async (id, actor) => {
      await TimeRecordService.deleteRecord(id, actor);
    },
    autoClose: () => TimeRecordService.processAutoClosures(),
    verify: (filters) => TimeRecordService.verifyIntegrity(filters),
    resolve: (id, resolution, actor) => TimeRecordService.resolveAnomaly(id, resolution, actor),
    export: (filters) => TimeRecordService.listRecordsForExport(filters),
  },
  now: () => new Date(),
  businessDate: getChileDateISO,
  withoutTriggers: (run) =>
    requestContext.run({ ...requestContext.getStore(), skipTrigger: true }, run),
  audit: (entry) => auditService.log(entry),
  emit: (event, payload) => SocketService.emit(event, payload),
});
