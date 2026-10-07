export { createEmailReportFlows, type EmailReportFlows } from "./application/flows";
export type {
  SmtpConfig,
  MultiSmtpConfig,
  EmailNotificationRules,
  EmailRule,
  ScheduledReportData,
  EmailReportDependencies,
} from "./application/contracts";
export { emailReportsPlugin } from "./http/routes";
