/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Email Center feature.
*/

import React from "react";
import Card from "../../../components/ui/Card";
import Container from "../../../components/ui/Container";
import {
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CogIcon,
  BellIcon,
  ShieldIcon,
  DocumentTextIcon,
} from "../../../components/ui/icons/index";
import SmtpConfigModal from "../../../components/ui/SmtpConfigModal";
import Button from "../../../components/ui/Button";
import type { EmailNotificationRules } from "../../../types";

interface EmailServiceStatus {
  loading: boolean;
  success: boolean;
  message: string;
}

interface ManualEmailDraft {
  to: string;
  subject: string;
  message: string;
}

interface RuleEditorProps {
  title: string;
  description: string;
  rule: { enabled: boolean; recipient: string };
  onFieldChange: (field: "enabled" | "recipient", value: boolean | string) => void;
  emailRecipientsList: string[];
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  title,
  description,
  rule,
  onFieldChange,
  emailRecipientsList,
}) => {
  return (
    <div className="group relative p-6 rounded-sm bg-token-surface-card border border-token-border-technical hover:border-(--sidebar-text-active)/30 transition duration-300 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-[11px] font-bold text-token-text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
            <BellIcon className="w-4 h-4 text-(--sidebar-text-active)" />
            {title}
          </h4>
          <p className="text-[10px] text-token-text-tertiary font-bold leading-relaxed uppercase tracking-tight opacity-70">
            {description}
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={rule.enabled}
            onChange={(e) => onFieldChange("enabled", e.target.checked)}
          />
          <div className="w-10 h-5 bg-token-surface-stripe peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-token-border-subtle after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-(--sidebar-text-active) shadow-inner"></div>
        </label>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ${rule.enabled ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-6 pt-6 border-t border-token-border-technical">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-token-text-tertiary mb-2">
              Destinatario del Reporte
            </label>
            <div className="relative group/select">
              <select
                value={rule.recipient}
                onChange={(e) => onFieldChange("recipient", e.target.value)}
                className="w-full h-11 pl-4 pr-10 rounded-sm bg-token-surface-card border border-token-border-technical text-[12px] font-bold uppercase tracking-tight text-token-text-primary focus:ring-1 focus:ring-(--sidebar-text-active) outline-none appearance-none transition-colors"
              >
                <option value="" className="bg-token-surface-card">
                  SELECCIONAR CORREO...
                </option>
                {emailRecipientsList.map((email) => (
                  <option key={email} value={email} className="bg-token-surface-card">
                    {email}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-token-text-tertiary">
                <EnvelopeIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface EmailCenterViewProps {
  emailRecipientsList: string[];
  isEmailListLoading: boolean;
  status: EmailServiceStatus;
  manualEmail: ManualEmailDraft;
  isSending: boolean;
  isConfigModalOpen: boolean;
  rules: EmailNotificationRules;
  isLoadingRules: boolean;
  setManualEmail: React.Dispatch<React.SetStateAction<ManualEmailDraft>>;
  setIsConfigModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  checkStatus: () => Promise<void>;
  handleRuleChange: (
    ruleKey: keyof EmailNotificationRules,
    field: "enabled" | "recipient",
    value: boolean | string,
  ) => void;
  handleManualSend: (e: React.FormEvent) => Promise<void>;
  handleSaveRules: () => Promise<void>;
  handleCloseConfigModal: () => void;
}

export const EmailCenterView: React.FC<EmailCenterViewProps> = ({
  emailRecipientsList,
  isEmailListLoading,
  status,
  manualEmail,
  isSending,
  isConfigModalOpen,
  rules,
  isLoadingRules,
  setManualEmail,
  setIsConfigModalOpen,
  checkStatus,
  handleRuleChange,
  handleManualSend,
  handleSaveRules,
  handleCloseConfigModal,
}) => {
  return (
    <Container variant="standard" noPadding data-ui-protected className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="secondary"
          onClick={() => setIsConfigModalOpen(true)}
          className="h-10 px-4 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
        >
          <CogIcon className="w-4 h-4 mr-2 text-(--sidebar-text-active)" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Configurar SMTP</span>
        </Button>
        <Button
          variant="primary"
          onClick={checkStatus}
          disabled={status.loading}
          className="h-10 px-4 bg-(--sidebar-text-active) text-white shadow-lg shadow-(--sidebar-text-active)/20 rounded-sm border-none"
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${status.loading ? "animate-spin" : ""}`} />
          <span className="text-[11px] font-bold uppercase tracking-widest">Verificar</span>
        </Button>
      </div>

      <Card variant="premium" className="overflow-hidden border-token-border-technical" noPadding>
        <div className="p-6 md:p-8 flex items-center justify-between flex-wrap gap-6 bg-token-surface-stripe">
          <div className="flex items-center gap-6">
            <div
              className={`p-4 rounded-sm border ${status.success ? "bg-(--status-success)/10 border-(--status-success)/20 text-(--status-success)" : "bg-(--status-error)/10 border-(--status-error)/20 text-(--status-error)"}`}
            >
              {status.loading ? (
                <ArrowPathIcon className="w-8 h-8 animate-spin" />
              ) : status.success ? (
                <ShieldIcon className="w-8 h-8" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary mb-1">
                Estado de Conexión
              </p>
              <h3
                className={`text-2xl font-black uppercase tracking-tighter ${status.success ? "text-(--status-success)" : "text-(--status-error)"}`}
              >
                {status.loading
                  ? "VALIDANDO..."
                  : status.success
                    ? "SERVICIO NOMINAL"
                    : "ERROR DE ENLACE"}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-tight text-token-text-tertiary opacity-70">
                {status.message}
              </p>
            </div>
          </div>

          {status.success && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-(--status-success)/10 border border-(--status-success)/20 text-(--status-success) text-[10px] font-bold uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-(--status-success) animate-pulse" />
              Conectividad Certificada
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card
          variant="premium"
          className="p-0 overflow-hidden border-token-border-technical flex flex-col"
          noPadding
        >
          <div className="bg-token-surface-header border-b border-token-border-technical px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-(--sidebar-text-active)/10 flex items-center justify-center border border-(--sidebar-text-active)/20">
                <PaperAirplaneIcon className="w-5 h-5 text-(--sidebar-text-active) transform -rotate-45" />
              </div>
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-token-text-primary">
                  Nueva Comunicación
                </h2>
                <p className="text-[9px] text-token-text-tertiary font-bold uppercase tracking-widest mt-0.5 opacity-60">
                  DRAFT COMPOSER
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 opacity-30">
              <div className="w-2 h-2 rounded-full bg-token-text-tertiary"></div>
              <div className="w-2 h-2 rounded-full bg-token-text-tertiary"></div>
              <div className="w-2 h-2 rounded-full bg-token-text-tertiary"></div>
            </div>
          </div>

          <form
            onSubmit={handleManualSend}
            className="flex flex-col h-full bg-token-surface-stripe"
          >
            <div className="px-8 py-4 border-b border-token-border-technical flex items-center group/field hover:bg-token-surface-active transition-colors">
              <label className="w-24 text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary">
                Para:
              </label>
              <input
                type="email"
                value={manualEmail.to}
                onChange={(e) => setManualEmail((p) => ({ ...p, to: e.target.value }))}
                required
                placeholder="DESTINATARIO@DOMINIO.COM"
                className="flex-1 bg-transparent border-none outline-none text-[12px] font-bold uppercase tracking-tight text-token-text-primary placeholder:text-token-text-tertiary/40 focus:ring-0"
              />
              <EnvelopeIcon className="w-4 h-4 text-token-text-tertiary group-hover/field:text-(--sidebar-text-active) transition-colors" />
            </div>

            <div className="px-8 py-4 border-b border-token-border-technical flex items-center group/field hover:bg-token-surface-active transition-colors">
              <label className="w-24 text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary">
                Asunto:
              </label>
              <input
                type="text"
                value={manualEmail.subject}
                onChange={(e) => setManualEmail((p) => ({ ...p, subject: e.target.value }))}
                required
                placeholder="TÍTULO DE LA COMUNICACIÓN"
                className="flex-1 bg-transparent border-none outline-none text-[12px] font-bold uppercase tracking-tight text-token-text-primary placeholder:text-token-text-tertiary/40 focus:ring-0"
              />
              <DocumentTextIcon className="w-4 h-4 text-token-text-tertiary group-hover/field:text-(--sidebar-text-active) transition-colors" />
            </div>

            <div className="flex-1 min-h-[300px] p-8 bg-token-surface-card">
              <textarea
                value={manualEmail.message}
                onChange={(e) => setManualEmail((p) => ({ ...p, message: e.target.value }))}
                required
                placeholder="ESCRIBA SU MENSAJE AQUÍ..."
                className="w-full h-full bg-transparent border-none outline-none text-[13px] font-bold uppercase tracking-tight leading-relaxed text-token-text-secondary placeholder:text-token-text-tertiary/40 focus:ring-0 resize-none"
              />
            </div>

            <div className="px-8 py-6 bg-token-surface-header border-t border-token-border-technical flex items-center justify-between">
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest opacity-60">
                {isSending ? "SINCRONIZANDO..." : "LISTO PARA DESPACHO"}
              </p>

              <Button
                type="submit"
                disabled={isSending || !status.success}
                className="h-11 px-8 bg-(--sidebar-text-active) text-white font-bold uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-(--sidebar-text-active)/20 rounded-sm disabled:opacity-30 border-none"
              >
                {isSending ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                )}
                {isSending ? "ENVIANDO..." : "DESPACHAR"}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          variant="premium"
          className="p-8 flex flex-col h-full border-token-border-technical"
          noPadding
        >
          <div className="flex items-center gap-3 border-b border-token-border-technical pb-6 mb-8">
            <div className="w-1 h-6 bg-(--sidebar-text-active) rounded-full"></div>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-token-text-primary">
              Notificaciones Automáticas
            </h2>
          </div>

          {isLoadingRules || isEmailListLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-token-text-tertiary">
              <ArrowPathIcon className="w-10 h-10 animate-spin text-(--sidebar-text-active)" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Sincronizando Motor de Reglas
              </p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              <RuleEditor
                title="Cierres Masivos de Turno"
                description="Alerta sobre jornadas críticas detectadas (>14h)."
                rule={rules.autoCloseShift}
                onFieldChange={(field, value) => handleRuleChange("autoCloseShift", field, value)}
                emailRecipientsList={emailRecipientsList}
              />
              <RuleEditor
                title="Desviación de Ingreso (>15m)"
                description="Detecta retrasos moderados en el cronograma."
                rule={rules.latenessOver15}
                onFieldChange={(field, value) => handleRuleChange("latenessOver15", field, value)}
                emailRecipientsList={emailRecipientsList}
              />
              <RuleEditor
                title="Atrasos Críticos (>60m)"
                description="Notificación de urgencia por ausencias prolongadas."
                rule={rules.latenessOver60}
                onFieldChange={(field, value) => handleRuleChange("latenessOver60", field, value)}
                emailRecipientsList={emailRecipientsList}
              />

              <div className="mt-8 pt-6 border-t border-token-border-technical">
                <Button
                  onClick={handleSaveRules}
                  className="w-full h-14 bg-token-surface-card border border-(--sidebar-text-active) text-(--sidebar-text-active) hover:bg-(--sidebar-text-active) hover:text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all rounded-sm"
                >
                  Guardar Configuraciones de Alerta
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <SmtpConfigModal isOpen={isConfigModalOpen} onClose={handleCloseConfigModal} />
    </Container>
  );
};
