export { createAuthenticate } from "./application/authenticate";
export type { AuthUser, AuthSession, AuthenticationDependencies } from "./application/authenticate";
export { verifyAccessToken, resolveAccessToken } from "./infrastructure/jwt";
export { createAuthFlows } from "./application/flows";
export type { AuthFlows, AuthFlowDependencies, AuthFlowContext } from "./application/flows";
export { authPlugin } from "./http/routes";
export { createAuth } from "./infrastructure/betterAuth";
export type { Auth } from "./infrastructure/betterAuth";
export {
  mapBetterAuthSession,
  sessionDurationHoursForRole,
  sessionLimitForRole,
} from "./infrastructure/sessionAdapter";
