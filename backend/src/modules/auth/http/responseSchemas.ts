const string = { type: "string" };
export const messageResponse = {
  type: "object",
  additionalProperties: false,
  required: ["message"],
  properties: { message: string },
};
export const sessionResponse = {
  type: "object",
  additionalProperties: false,
  required: ["userId", "username", "role", "token", "mustChangePassword", "message"],
  properties: {
    userId: string,
    username: string,
    role: string,
    employeeId: { type: ["string", "null"] },
    token: string,
    mustChangePassword: { type: "boolean" },
    message: string,
  },
};
export const loginResponse = {
  anyOf: [
    sessionResponse,
    {
      type: "object",
      additionalProperties: false,
      required: ["mfaRequired", "mfaToken", "userId", "message"],
      properties: {
        mfaRequired: { type: "boolean", const: true },
        mfaToken: string,
        userId: string,
        message: string,
      },
    },
  ],
};
export const kioskResponse = {
  type: "object",
  additionalProperties: false,
  required: ["success", "employeeName", "token", "message"],
  properties: {
    success: { type: "boolean", const: true },
    employeeName: string,
    token: string,
    message: string,
  },
};
export const setupResponse = {
  type: "object",
  additionalProperties: false,
  required: ["qrCode", "secret", "message"],
  properties: { qrCode: string, secret: string, message: string },
};
