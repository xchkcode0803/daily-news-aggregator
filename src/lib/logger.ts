import { inspect } from "node:util";

type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const payload = fields ? ` ${serializeFields(fields)}` : "";
  console[level](`[${level}] ${message}${payload}`);
}

function serializeFields(fields: LogFields) {
  try {
    return JSON.stringify(fields, (_key, value: unknown) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      return value;
    });
  } catch {
    return inspect(fields, { depth: 4, breakLength: 160 });
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};
