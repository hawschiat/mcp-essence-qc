import * as turf from "@turf/turf"
import z from "zod";
import { GeoJSON2DPointSchema, GeoJSONFeatureCollectionGenericSchema } from "zod-geojson";
import { GeoPointRBush } from "./rbush.js";
import { FeaturePropertySchema, GasPrices, GasType, GasTypeSchema } from "./types.js";

let cachedETag: string | undefined = undefined;
let cachedData: GeoPointRBush | undefined = undefined;

const API_URL = "https://regieessencequebec.ca/stations.geojson.gz";
const USER_AGENT = "mcp-essence-qc/1.0"

const ApiResponseSchema = GeoJSONFeatureCollectionGenericSchema(z.array(z.number()), FeaturePropertySchema, GeoJSON2DPointSchema)

async function fetchData(): Promise<GeoPointRBush> {
    if (cachedData !== undefined && cachedETag !== undefined) {
        // first check if the cache is expired
        const headResponse = await fetch(API_URL, {
            method: "HEAD",
            headers: {
                "User-Agent": USER_AGENT,
            }
        });

        if (headResponse.ok) {
            const etag = headResponse.headers.get("etag");

            if (etag === cachedETag) {
                return cachedData;
            }

            // if cache misses, proceed to the following steps to re-fetch the data
        }
    }

    const response = await fetch(API_URL, {
        headers: {
            "User-Agent": USER_AGENT,
        }
    });
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} and body "${await response.text()}"`);
    }

    const body = await response.json();
    const parsedData = ApiResponseSchema.parse(body);

    // save cache
    cachedETag = response.headers.get("etag") || undefined;
    cachedData = new GeoPointRBush().load(parsedData.features);

    return cachedData;
}

const FindParametersSchema = z.object({
    radiusKm: z.number(),
    targetType: z.optional(GasTypeSchema),
});
const SortParametersSchema = z.object({
    order: z.enum(["asc", "desc"]),
    fuelConsumption: z.number(),
    fillUpVolume: z.number(),
});

type Coordinates = [number, number];
type FindParameters = z.infer<typeof FindParametersSchema>;
type SortParameters = z.infer<typeof SortParametersSchema>;

const defaultSortParams: SortParameters = {
    order: 'asc',
    fuelConsumption: 8.9,
    fillUpVolume: 50,
};

// Helper to normalize (0 to 1)
function normalize<T extends number>(val: T, min: T, max: T){
    return (max === min ? 0 : (val - min) / (max - min));
}

function findGasPrice(prices: GasPrices, targetType: GasType | undefined) {
    const filtered = prices.filter(p => p.Price !== null);
    return targetType ?
        filtered.find(p => p.GasType === targetType)?.Price :
        Math.min(...(filtered.map(p => p.Price) as number[]));
}

type Candidate = z.infer<typeof FeaturePropertySchema> & {
    coordinates: Coordinates;
    distance: number;
    trueCost: number;
};

export async function findStationsWithinRadius(pos: Coordinates, findParams: FindParameters, sortParams: SortParameters = defaultSortParams): Promise<Candidate[]> {
    const tree = await fetchData();
    const centerPoint = turf.point(pos);

    const { radiusKm, targetType } = findParams;

    // Create the BBox for the radius
    // Turf's circle creates a polygon, then we get its bbox
    const circle = turf.circle(centerPoint, radiusKm, { units: 'kilometers' });
    const [minX, minY, maxX, maxY] = turf.bbox(circle);

    // returns points in the square
    const candidates = tree.search({ minX, minY, maxX, maxY });

    // Sort by score
    return candidates
        .map(c => {
            const dist = turf.distance(centerPoint, c, { units: 'kilometers' });

            const price = findGasPrice(c.properties.Prices, targetType);
            if (typeof price !== "number") {
                return null;
            }

            // 1. Numeric price in dollars (e.g., 164.9¢ becomes 1.649)
            const pricePerLiter = price / 100;

            // 2. Cost of the gas you are buying
            const purchaseCost = sortParams.fillUpVolume * pricePerLiter;

            // 3. Cost of the fuel burned (Round trip distance)
            // Formula: (Total KM / 100) * L per 100km * Price per L
            const travelCost = ((dist * 2) / 100) * sortParams.fuelConsumption * pricePerLiter;

            return { ...c.properties, coordinates: c.geometry.coordinates, distance: dist, trueCost: purchaseCost + travelCost };
        })
        .filter((f): f is Candidate => f !== null && f.distance <= radiusKm)
        .sort((a, b) => sortParams.order === 'asc' ?
            a.trueCost - b.trueCost :
            b.trueCost - a.trueCost
        );
}
