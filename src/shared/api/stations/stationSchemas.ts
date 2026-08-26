import { z } from "zod";

export const baseStationSchema = z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
});

export type BaseStation = z.infer<typeof baseStationSchema>;
