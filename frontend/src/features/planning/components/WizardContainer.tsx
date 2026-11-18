import React from "react";
import { useMonthlyPlanWizard } from "../hooks/useMonthlyPlanWizard";
import { MonthlyPlanWizardView } from "../views/MonthlyPlanWizard.view";

const WizardContainer: React.FC = () => {
  const wizard = useMonthlyPlanWizard();

  return (
    <MonthlyPlanWizardView
      sortedEmployees={wizard.sortedEmployees}
      isLoadingEmployees={wizard.isLoadingEmployees}
      yearOptions={wizard.yearOptions}
      selectedEmployeeId={wizard.selectedEmployeeId}
      onSelectEmployee={wizard.setSelectedEmployeeId}
      selectedYear={wizard.selectedYear}
      onSelectYear={wizard.setSelectedYear}
      selectedMonth={wizard.selectedMonth}
      onSelectMonth={wizard.setSelectedMonth}
      patternName={wizard.patternName}
      onPatternNameChange={wizard.setPatternName}
      defaultStartTime={wizard.defaultStartTime}
      onDefaultStartTimeChange={wizard.setDefaultStartTime}
      defaultEndTime={wizard.defaultEndTime}
      onDefaultEndTimeChange={wizard.setDefaultEndTime}
      rows={wizard.rows}
      isSuggestingName={wizard.isSuggestingName}
      isSaving={wizard.isSaving}
      isLoadingPlan={wizard.isLoadingPlan}
      isPlanError={wizard.isPlanError}
      planErrorMessage={wizard.planErrorMessage}
      totalWorkDays={wizard.totalWorkDays}
      totalPlannedHours={wizard.totalPlannedHours}
      onSuggestName={() => void wizard.handleSuggestName()}
      onToggleDayType={wizard.handleToggleDayType}
      onTimeChange={wizard.handleTimeChange}
      onApplyWeekdays={wizard.handleApplyWeekdays}
      onClearAllRest={wizard.handleClearAllRest}
      onSaveMonthlyPlan={() => void wizard.handleSaveMonthlyPlan()}
    />
  );
};

export default WizardContainer;
