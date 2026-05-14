import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export function createResendClient(apiKey = getEnv().RESEND_API_KEY) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("RESEND_API_KEY is required to create the Resend client");
  }

  return new Resend(apiKey);
}
