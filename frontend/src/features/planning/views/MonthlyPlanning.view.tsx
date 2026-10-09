import React from "react";
import { motion } from "framer-motion";
import PageHeader from "../../../components/ui/PageHeader";
import Container from "../../../components/ui/Container";
import WizardContainer from "../components/WizardContainer";
import { CalendarDaysIcon } from "../../../components/ui/icons";

export interface MonthlyPlanningViewProps {
  isEmbedded?: boolean;
  title: string;
  subtitle: string;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Monthly Planning.
*/
export const MonthlyPlanningView: React.FC<MonthlyPlanningViewProps> = ({ title, subtitle }) => {
  return (
    <Container variant="wide" noPadding data-ui-protected className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 animate-in fade-in duration-500"
      >
        <PageHeader
          eyebrow="Planificación"
          eyebrowIcon={<CalendarDaysIcon className="w-3.5 h-3.5" />}
          icon={<CalendarDaysIcon className="w-4 h-4" />}
          title={title}
          subtitle={subtitle}
        />

        <div className="relative">
          <WizardContainer />
        </div>
      </motion.div>
    </Container>
  );
};
