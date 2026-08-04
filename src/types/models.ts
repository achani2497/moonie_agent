import { ZodObject } from "zod";

export type AvailableModels = "gemini-2.5-flash" | "gemini-3.1-flash-lite"

export type StructuredPayload = {
    schema: ZodObject,
    name: string
}
