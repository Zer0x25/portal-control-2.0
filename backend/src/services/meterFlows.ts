import { createMeterFlows } from "../modules/meters";
import { MeterService } from "./MeterService";
import { BulkMeterReadingSchema, MeterReadingQuerySchema } from "../models/schemas/meter.schemas";
export const meterFlows = createMeterFlows({
  parseQuery: (value) => MeterReadingQuerySchema.parse(value),
  list: (params) => MeterService.list(params),
  parse: (value) => BulkMeterReadingSchema.parse(value),
  create: (value, actor) => MeterService.bulkCreate(value, actor),
});
