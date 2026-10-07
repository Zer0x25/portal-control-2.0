import { createLeaveFlows } from "../modules/leaves";
import { LeaveService } from "./LeaveService";
export const leaveFlows = createLeaveFlows({
  service: {
    list: (params, user) => LeaveService.list(params, user),
    upsert: (data) => LeaveService.upsert(data),
    delete: async (id) => {
      await LeaveService.delete(id);
    },
  },
});
