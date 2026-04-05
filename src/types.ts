import z from "zod";

const GasPricesSchema = z.array(z.object({
    GasType: z.string().lowercase(),
    Price: z.string().transform(s => {
        const match = s.match(/^(\d|\.)+¢$/);
        if (match && match[1]) {
            return Number(match[1]);
        }
        return null;
    }),
    IsAvailable: z.boolean(),
}));

export type GasPrices = z.infer<typeof GasPricesSchema>;

export const FeaturePropertySchema = z.object({
    // normalize the values by lowercasing
    Name: z.string().lowercase(),
    brand: z.string().lowercase(),
    status: z.string().lowercase(),
    Address: z.string().lowercase(),
    PostalCode: z.string().lowercase(),
    Region: z.string().lowercase(),
    Prices: GasPricesSchema,
});

export enum GasType {
    REGULAR = "régulier",
    PREMIUM = "super",
    DIESEL = "diesel"
}
export const GasTypeSchema = z.enum(Object.values(GasType));
