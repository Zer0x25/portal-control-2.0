import { z } from "zod";
export const PurgeSessionsBodySchema = z.object({ username: z.string().min(1).optional() });
export const ResetPasswordBodySchema = z.object({
  username: z.string().min(1),
  newPassword: z.string().min(6),
});
