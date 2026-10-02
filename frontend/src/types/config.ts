export type Theme = "system" | "light" | "dark";

export interface EmailNotificationRules {
  autoCloseShift: {
    enabled: boolean;
    recipient: string;
  };
  latenessOver15: {
    enabled: boolean;
    recipient: string;
  };
  latenessOver60: {
    enabled: boolean;
    recipient: string;
  };
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface MultiSmtpConfig {
  profiles: SmtpConfig[];
  activeProfileIndex: number;
}

/** A backup artifact reported by the backend governance endpoints. */
export interface BackupFile {
  name: string;
  createdAt: string;
  size: number;
  sizeFormatted: string;
}
