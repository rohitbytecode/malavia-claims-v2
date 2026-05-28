import net from "node:net";
import tls from "node:tls";
import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const SMTP_TIMEOUT_MS = 12_000;

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function dotStuff(value: string) {
  return value.replace(/^\./gm, "..");
}

function formatAddress(address: string) {
  return `<${address.trim()}>`;
}

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";

  async connect() {
    this.socket = await new Promise<net.Socket | tls.TLSSocket>(
      (resolve, reject) => {
        const onError = (error: Error) => reject(error);
        const socket = env.SMTP_SECURE
          ? tls.connect(
              {
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                servername: env.SMTP_HOST,
              },
              () => resolve(socket)
            )
          : net.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT }, () =>
              resolve(socket)
            );

        socket.setTimeout(SMTP_TIMEOUT_MS, () =>
          socket.destroy(new Error("SMTP connection timed out"))
        );
        socket.once("error", onError);
      }
    );

    this.attachSocketHandlers();
    await this.expect([220]);
  }

  async send(message: MailMessage) {
    if (!this.socket) throw new Error("SMTP socket is not connected");

    const hostname = env.SMTP_HELO_HOST ?? "localhost";
    await this.command(`EHLO ${hostname}`, [250]);

    if (env.SMTP_STARTTLS && !env.SMTP_SECURE) {
      await this.command("STARTTLS", [220]);
      await this.upgradeToTls();
      await this.command(`EHLO ${hostname}`, [250]);
    }

    if (env.SMTP_USER && env.SMTP_PASS) {
      await this.command("AUTH LOGIN", [334]);
      await this.command(encodeBase64(env.SMTP_USER), [334]);
      await this.command(encodeBase64(env.SMTP_PASS), [235]);
    }

    const from = env.MAIL_FROM ?? env.SMTP_USER;
    if (!from) {
      throw new Error(
        "MAIL_FROM or SMTP_USER must be configured to send email"
      );
    }

    await this.command(`MAIL FROM:${formatAddress(from)}`, [250]);
    await this.command(`RCPT TO:${formatAddress(message.to)}`, [250, 251]);
    await this.command("DATA", [354]);

    const body = this.buildMessage(from, message);
    await this.command(`${dotStuff(body)}\r\n.`, [250]);
    await this.command("QUIT", [221]);
  }

  close() {
    this.socket?.destroy();
    this.socket = null;
  }

  private attachSocketHandlers() {
    this.socket?.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
    });
  }

  private async upgradeToTls() {
    if (!this.socket) throw new Error("SMTP socket is not connected");

    this.buffer = "";
    this.socket.removeAllListeners("data");
    this.socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const secureSocket = tls.connect(
        { socket: this.socket as net.Socket, servername: env.SMTP_HOST },
        () => resolve(secureSocket)
      );
      secureSocket.once("error", reject);
    });
    this.attachSocketHandlers();
  }

  private buildMessage(from: string, message: MailMessage) {
    const headers = [
      `From: ${formatAddress(escapeHeader(from))}`,
`To: ${formatAddress(escapeHeader(message.to))}`,
      `Subject: ${escapeHeader(message.subject)}`,
      "MIME-Version: 1.0",
      message.html
        ? 'Content-Type: multipart/alternative; boundary="malavia-claims-boundary"'
        : 'Content-Type: text/plain; charset="UTF-8"',
    ];

    if (!message.html) {
      return `${headers.join("\r\n")}\r\n\r\n${message.text}`;
    }

    return `${headers.join("\r\n")}\r\n\r\n--malavia-claims-boundary\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${message.text}\r\n--malavia-claims-boundary\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${message.html}\r\n--malavia-claims-boundary--`;
  }

  private async command(command: string, expectedCodes: number[]) {
    if (!this.socket) throw new Error("SMTP socket is not connected");
    this.buffer = "";
    this.socket.write(`${command}\r\n`);
    return this.expect(expectedCodes);
  }

  private async expect(expectedCodes: number[]) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < SMTP_TIMEOUT_MS) {
      const lines = this.buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      if (lastLine && /^\d{3} /.test(lastLine)) {
        const code = Number(lastLine.slice(0, 3));
        if (expectedCodes.includes(code)) return this.buffer;
        throw new Error(`SMTP command failed: ${this.buffer}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error("SMTP server response timed out");
  }
}

export class SmtpMailService {
  static isConfigured() {
    return Boolean(
      env.SMTP_HOST && env.SMTP_PORT && (env.MAIL_FROM || env.SMTP_USER)
    );
  }

  static async send(message: MailMessage) {
    if (!this.isConfigured()) {
      logger.warn(
        { to: message.to, subject: message.subject },
        "Advanced notification email skipped because SMTP is not configured"
      );
      return;
    }

    const client = new SmtpClient();
    try {
      await client.connect();
      await client.send(message);
    } finally {
      client.close();
    }
  }
}
