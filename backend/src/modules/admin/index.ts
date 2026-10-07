export { createAdminFlows, type AdminFlows } from "./application/flows";
export type {
  AdminDependencies,
  AdminActor,
  AdminResponse,
  AdminRespond,
} from "./application/contracts";
export { adminPlugin } from "./http/routes";
