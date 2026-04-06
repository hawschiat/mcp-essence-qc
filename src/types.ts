import z from "zod";

const GasPricesSchema = z.array(z.object({
    GasType: z.string().toLowerCase(),
    Price: z.string().nullable().transform(s => {
        if (!s) {
            return null;
        }

        const match = s.match(/[\d.]+/);
        if (match && match[0]) {
            return Number(match[0]);
        }
        return null;
    }),
    IsAvailable: z.boolean(),
}));

export type GasPrices = z.infer<typeof GasPricesSchema>;

export const FeaturePropertySchema = z.object({
    // normalize the values by lowercasing
    Name: z.string().toLowerCase(),
    brand: z.string().toLowerCase().nullable(),
    Status: z.string().toLowerCase(),
    Address: z.string().toLowerCase(),
    PostalCode: z.string().toLowerCase(),
    Region: z.string().toLowerCase(),
    Prices: GasPricesSchema,
});

export enum GasType {
    REGULAR = "régulier",
    PREMIUM = "super",
    DIESEL = "diesel"
}
export const GasTypeSchema = z.enum(Object.values(GasType));
