// Wire DTOs serialize Prisma dates to ISO strings.
const recordProperties = {
  id: { type: "string" },
  date: { type: "string" },
  name: { type: "string" },
  type: { type: "string" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};
export const holidayRecordResponse = {
  type: "object",
  properties: recordProperties,
  required: Object.keys(recordProperties),
  additionalProperties: false,
};
const viewProperties = {
  ...recordProperties,
  lastModified: { type: "number" },
  syncStatus: { type: "string", const: "synced" },
  isDeleted: { type: "boolean", const: false },
};
const views = {
  type: "array",
  items: {
    type: "object",
    properties: viewProperties,
    required: Object.keys(viewProperties),
    additionalProperties: false,
  },
};
export const holidayQueryResponse = {
  anyOf: [
    views,
    {
      type: "object",
      properties: {
        data: views,
        meta: {
          type: "object",
          properties: {
            total: { type: "number" },
            page: { type: "number" },
            pageSize: { type: "number" },
            totalPages: { type: "number" },
          },
          required: ["total", "page", "pageSize", "totalPages"],
          additionalProperties: false,
        },
      },
      required: ["data", "meta"],
      additionalProperties: false,
    },
  ],
};
export const holidayBulkResponse = {
  type: "object",
  properties: { count: { type: "number" } },
  required: ["count"],
  additionalProperties: false,
};
export const holidaySyncResponse = {
  type: "object",
  properties: { success: { type: "boolean" }, total: { type: "number" }, year: { type: "number" } },
  required: ["success", "total", "year"],
  additionalProperties: false,
};
