import { createMeterFlows } from "../modules/meters";
import { MeterService } from "./MeterService";
import { BulkMeterReadingSchema } from "../models/schemas/meter.schemas";
export const meterFlows = createMeterFlows({
  list: (params) => MeterService.list(params),
  parse: (value) => BulkMeterReadingSchema.parse(value),
  create: (value) => MeterService.bulkCreate(value),
});
