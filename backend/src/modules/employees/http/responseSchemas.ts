const clockingOptionProperties = {
  id: { type: "string" },
  name: { type: "string" },
  position: { type: "string" },
  area: { type: "string" },
  workdayType: { type: "string" },
  status: { type: "string", const: "Activo" },
};

export const employeeClockingOptionsResponse = {
  type: "array",
  items: {
    type: "object",
    properties: clockingOptionProperties,
    required: Object.keys(clockingOptionProperties),
    additionalProperties: false,
  },
};
