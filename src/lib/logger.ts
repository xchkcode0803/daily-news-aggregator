type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const payload = fields ? ` ${JSON.stringify(fields)}` : "";
  console[level](`[${level}] ${message}${payload}`);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};
