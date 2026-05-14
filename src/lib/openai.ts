import OpenAI from "openai";
import { getEnv } from "@/lib/env";

export function createOpenAIClient(apiKey = getEnv().OPENAI_API_KEY) {
  return new OpenAI({ apiKey });
}
