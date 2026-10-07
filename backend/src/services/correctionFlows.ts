import { createCorrectionFlows } from "../modules/corrections";
import { CorrectionService } from "./CorrectionService";
export const correctionFlows = createCorrectionFlows({
  service: {
    list: (params, user) => CorrectionService.list(params, user),
    create: (data, user) => CorrectionService.create(data, user),
    updateStatus: (id, data) => CorrectionService.updateStatus(id, data),
    stats: (user) => CorrectionService.getStats(user),
    history: (id, user) => CorrectionService.getHistory(id, user),
  },
});
