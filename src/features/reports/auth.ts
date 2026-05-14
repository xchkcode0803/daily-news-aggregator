import { createHash, timingSafeEqual } from "node:crypto";

export function isValidReportViewToken(token: string | undefined, expectedToken = process.env.REPORT_VIEW_TOKEN) {
  if (!token || !expectedToken) {
    return false;
  }

  return timingSafeEqual(hashToken(token), hashToken(expectedToken));
}

export function isValidBearerToken(authorization: string | null, expectedToken: string | undefined) {
  if (!authorization?.startsWith("Bearer ") || !expectedToken) {
    return false;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return false;
  }

  return timingSafeEqual(hashToken(token), hashToken(expectedToken));
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest();
}
