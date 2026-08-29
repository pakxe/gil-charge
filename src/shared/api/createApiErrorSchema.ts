import { z } from "zod";

export function createApiErrorSchema<const Codes extends readonly string[]>(codes: Codes) {
    return z.object({
        code: z.enum(codes),
        message: z.string(),
    });
}
