import { describe, expect, it } from "vitest";

import {
  EmployeeSchema as EmployeeFromBarrel,
  CreateUserSchema as CreateUserFromBarrel,
  TimeRecordSchema as TimeRecordFromBarrel,
} from "../src/models/schemas";

import { EmployeeSchema as EmployeeFromModule } from "../src/models/schemas/employee.schemas";
import { CreateUserSchema as CreateUserFromModule } from "../src/models/schemas/auth-user.schemas";
import { TimeRecordSchema as TimeRecordFromModule } from "../src/models/schemas/time-correction.schemas";

describe("Schemas Export Compatibility", () => {
  it("barrel and module exports should reference the same schema objects", () => {
    expect(EmployeeFromBarrel).toBe(EmployeeFromModule);
    expect(CreateUserFromBarrel).toBe(CreateUserFromModule);
    expect(TimeRecordFromBarrel).toBe(TimeRecordFromModule);
  });
});
