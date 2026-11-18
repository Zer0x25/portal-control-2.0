import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(async () => ({})),
  findUnique: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mocks.sendMail,
      verify: vi.fn(async () => true),
    })),
  },
}));

vi.mock("../../src/services/db", () => ({
  default: {
    systemConfig: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("../../src/utils/cryptoUtils", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: mocks.decrypt,
  isEncrypted: vi.fn((v: string) => v.startsWith("enc:")),
}));

import { isSafeSmtpHost } from "../../src/utils/smtpHostGuard";
import { SmtpVerifySchema } from "../../src/models/schemas/smtpProfile.schemas";
import { EmailService } from "../../src/services/EmailService";

describe("EmailService security & SSRF guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("blocks localhost, loopback, link-local/metadata and RFC1918/ULA SMTP hosts by default", () => {
    const blocked = [
      "localhost",
      "sub.localhost",
      "0.0.0.0",
      "127.0.0.1",
      "127.1.2.3",
      "::1",
      "[::1]",
      "::ffff:127.0.0.1",
      "169.254.169.254",
      "fe80::1",
      "[fe80::1%eth0]",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.10",
      "fc00::1",
      "fd12:3456::1",
    ];
    for (const host of blocked) {
      expect(isSafeSmtpHost(host)).toBe(false);
      expect(
        SmtpVerifySchema.safeParse({
          host,
          port: 587,
          secure: false,
          user: "u",
          pass: "p",
          fromEmail: "noreply@example.com",
          fromName: "Portal",
        }).success,
      ).toBe(false);
    }

    expect(isSafeSmtpHost("smtp.example.com")).toBe(true);
    expect(isSafeSmtpHost("172.32.0.1")).toBe(true);
  });

  it("allows private SMTP hosts when SMTP_ALLOW_PRIVATE_HOSTS=true", () => {
    vi.stubEnv("SMTP_ALLOW_PRIVATE_HOSTS", "true");
    expect(isSafeSmtpHost("127.0.0.1")).toBe(true);
    expect(isSafeSmtpHost("192.168.1.10")).toBe(true);
    expect(isSafeSmtpHost("localhost")).toBe(true);
  });

  it("escapes HTML in sendEmail message before converting newlines to <br>", async () => {
    mocks.findUnique.mockResolvedValue({
      key: "SMTP_CONFIG",
      value: JSON.stringify({
        profiles: [
          {
            host: "smtp.example.com",
            port: 587,
            secure: false,
            user: "u",
            pass: "plain",
            fromEmail: "noreply@example.com",
            fromName: "Portal",
          },
          { host: "", port: 587, secure: false, user: "", pass: "", fromEmail: "", fromName: "P" },
          { host: "", port: 587, secure: false, user: "", pass: "", fromEmail: "", fromName: "P" },
        ],
        activeProfileIndex: 0,
      }),
    });

    const service = new EmailService();
    const res = await service.sendEmail(
      "to@example.com",
      "Asunto",
      'Hola <script>alert("xss")</script> & \'test\'\nSegunda línea',
    );
    expect(res.success).toBe(true);
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: "Hola &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;<br>Segunda línea",
      }),
    );
  });

  it("catches decrypt failures inside sendEmail and sendEmailWithAttachment without throwing", async () => {
    mocks.findUnique.mockResolvedValue({
      key: "SMTP_CONFIG",
      value: JSON.stringify({
        profiles: [
          {
            host: "smtp.example.com",
            port: 587,
            secure: false,
            user: "u",
            pass: "enc:corrupt",
            fromEmail: "noreply@example.com",
            fromName: "Portal",
          },
          { host: "", port: 587, secure: false, user: "", pass: "", fromEmail: "", fromName: "P" },
          { host: "", port: 587, secure: false, user: "", pass: "", fromEmail: "", fromName: "P" },
        ],
        activeProfileIndex: 0,
      }),
    });
    mocks.decrypt.mockImplementation(() => {
      throw new Error("bad decrypt");
    });

    const service = new EmailService();
    await expect(service.sendEmail("to@example.com", "Sub", "Body")).resolves.toEqual({
      success: false,
      message: "No se pudo enviar el correo",
    });
    await expect(
      service.sendEmailWithAttachment("to@example.com", "Sub", "<p>Body</p>", Buffer.from("x"), "a.txt"),
    ).resolves.toEqual({
      success: false,
      message: "No se pudo enviar el correo",
    });
  });
});
