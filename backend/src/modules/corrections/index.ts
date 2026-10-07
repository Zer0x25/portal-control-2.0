export { createCorrectionFlows, type CorrectionFlows } from "./application/flows";
export type {
  CorrectionPrincipal,
  CorrectionQuery,
  CorrectionInput,
  CorrectionStatusInput,
  CorrectionScope,
  CorrectionFlowDependencies,
} from "./application/contracts";
export { correctionsPlugin } from "./http/routes";
