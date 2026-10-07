export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailRule {
  enabled: boolean;
  recipient: string;
}

export interface EmailNotificationRules {
  autoCloseShift: EmailRule;
  latenessOver15: EmailRule;
  latenessOver60: EmailRule;
}

export interface MultiSmtpConfig {
  profiles: SmtpConfig[];
  activeProfileIndex: number;
}

export interface ScheduledReportData {
  name: string;
  description?: string;
  reportType: string;
  frequency: string;
  cronExpression: string;
  recipients: string | string[];
  filters?: unknown;
  isActive?: boolean;
}

export interface EmailResult {
  success: boolean;
  message: string;
}
export interface EmailReportDependencies<Report> {
  email: {
    parseProfile(value: unknown): SmtpConfig;
    parseConfig(value: unknown): MultiSmtpConfig;
    verify(config: SmtpConfig): Promise<EmailResult>;
    saveConfig(config: MultiSmtpConfig): Promise<void>;
    config(): Promise<MultiSmtpConfig>;
    rules(): Promise<EmailNotificationRules>;
    saveRules(rules: EmailNotificationRules): Promise<void>;
    send(to: string, subject: string, message: string): Promise<EmailResult>;
  };
  reports: {
    list(): Promise<Report[]>;
    get(id: string): Promise<Report | null>;
    create(data: ScheduledReportData, actor: string): Promise<Report>;
    update(id: string, data: Partial<ScheduledReportData>): Promise<Report>;
    remove(id: string): Promise<unknown>;
    toggle(id: string): Promise<Report>;
  };
}
