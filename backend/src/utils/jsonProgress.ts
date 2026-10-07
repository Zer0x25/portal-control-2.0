import type { MaintenanceOutput } from "../modules/maintenance";
interface ProgressResponse {
  setHeader(name: string, value: string): unknown;
  flushHeaders(): void;
  write(value: string): unknown;
  end(): unknown;
}
export function jsonProgressOutput(res: ProgressResponse): MaintenanceOutput {
  return {
    start() {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-No-Compression", "true");
      res.flushHeaders();
    },
    write(value) {
      res.write(JSON.stringify(value) + "\n");
    },
    end() {
      res.end();
    },
  };
}
