import { z } from "zod";

const responseSchema = z.object({
  status: z.literal("success"),
  data: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      title: z.string(),
      inalienable: z.boolean(),
    }),
  ),
});
interface ProviderLogger {
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}
export function createBoostrProvider(fetcher: typeof fetch, log: ProviderLogger) {
  return {
    async list(year: number) {
      log.warn(`[HolidayService] Fetching holidays for ${year} from Boostr...`);
      try {
        const response = await fetcher(`https://api.boostr.cl/holidays/${year}.json`);
        if (!response.ok) {
          const text = await response.text().catch(() => "N/A");
          log.error(`[HolidayService] API Error ${response.status}:`, text);
          throw new Error(`API de Boostr respondió con status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json"))
          throw new Error(`API de Boostr no devolvió JSON (${contentType || "N/A"})`);
        const result: unknown = await response.json();
        const parsed = responseSchema.safeParse(result);
        if (!parsed.success) {
          log.error("[HolidayService] Invalid API response format:", result);
          throw new Error("Formato de respuesta de API de Boostr inválido");
        }
        return parsed.data.data;
      } catch (error) {
        log.error("[HolidayService] Sync failed:", error);
        throw error;
      }
    },
  };
}
