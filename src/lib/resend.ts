import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export function createResendClient(apiKey = getEnv().RESEND_API_KEY) {
  return new Resend(apiKey);
}
