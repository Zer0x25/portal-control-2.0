import net from "node:net";
import { ValidationError } from "./AppError";

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;

  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (net.isIPv4(mapped)) {
      return isPrivateOrReservedIPv4(mapped);
    }
    const hexMatch = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(mapped);
    if (hexMatch) {
      const hi = parseInt(hexMatch[1]!, 16);
      const lo = parseInt(hexMatch[2]!, 16);
      const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateOrReservedIPv4(dotted);
    }
  }

  const firstSegment = lower.split(":")[0];
  if (!firstSegment) return false;
  const firstHextet = parseInt(firstSegment, 16);
  if (Number.isNaN(firstHextet)) return false;

  // fe80::/10 link-local, fc00::/7 unique local (ULA)
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  if ((firstHextet & 0xfe00) === 0xfc00) return true;
  return false;
}

/**
 * Returns true if the SMTP host is safe to connect to (not loopback, link-local,
 * metadata, or RFC1918/ULA private space), unless SMTP_ALLOW_PRIVATE_HOSTS=true.
 */
export function isSafeSmtpHost(rawHost: string): boolean {
  const trimmed = rawHost.trim();
  if (!trimmed) return true;
  if (process.env.SMTP_ALLOW_PRIVATE_HOSTS === "true") return true;

  // Strip IPv6 brackets and optional zone index (e.g. [fe80::1%eth0])
  let normalized = trimmed.replace(/^\[(.*)\]$/, "$1");
  const zoneIdx = normalized.indexOf("%");
  if (zoneIdx !== -1) normalized = normalized.slice(0, zoneIdx);

  const lower = normalized.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower === "localhost.localdomain") {
    return false;
  }

  if (net.isIPv4(normalized)) {
    return !isPrivateOrReservedIPv4(normalized);
  }
  if (net.isIPv6(normalized)) {
    return !isPrivateOrReservedIPv6(normalized);
  }

  return true;
}

export function assertSafeSmtpHost(host: string): void {
  if (!isSafeSmtpHost(host)) {
    throw new ValidationError("El servidor SMTP no puede apuntar a direcciones locales o privadas");
  }
}
