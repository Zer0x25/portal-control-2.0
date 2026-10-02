import { Employee } from "../types";

/**
 * Creates a stable, unique identifier from a set of employee filters.
 * @param employees - The array of employees included in the filter.
 * @returns A string identifier.
 */
export const createFiltersIdentifier = (employees: Employee[]): string => {
  if (employees.length === 0) return "no-employees";

  // A more robust identifier than just joining IDs, in case other filters are added.
  const filterKey = {
    employeeIds: employees.map((e) => e.id).sort(),
    // Future filters like area or workdayType would be added here to the key.
  };

  // Simple stringification is sufficient for a client-side cache key.
  return JSON.stringify(filterKey);
};
