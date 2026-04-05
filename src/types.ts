import z from "zod";

export const FeaturePropertySchema = z.object({
    Name: z.string(),
    brand: z.string(),
    status: z.string(),
    Address: z.string(),
    PostalCode: z.string(),
    Region: z.string(),
    Prices: z.array(z.object({
        GasType: z.string(),
        Price: z.string().transform(s => {
            const match = s.match(/^(\d|\.)+¢$/);
            if (match && match[1]) {
                return Number(match[1]);
            }
            return null;
        }),
        IsAvailable: z.boolean(),
    }))
});
