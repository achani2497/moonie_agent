import { ZodObject } from "zod";

export type AvailableModels = "gemini-2.5-flash"

export type StructuredPayload = {
    schema: ZodObject,
    name: string
}
