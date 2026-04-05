import z from "zod";
import { GeoJSON2DPointSchema, GeoJSONFeatureCollectionGenericSchema } from "zod-geojson";
import { GeoPointRBush } from "./rbush";
import { FeaturePropertySchema } from "./types";

let cachedETag: string | undefined = undefined;
let cachedData: GeoPointRBush | undefined = undefined;

const API_URL = "https://regieessencequebec.ca/stations.geojson.gz";

const ApiResponseSchema = GeoJSONFeatureCollectionGenericSchema(z.array(z.number()), FeaturePropertySchema, GeoJSON2DPointSchema)

async function fetchData(): Promise<GeoPointRBush> {
    if (cachedData !== undefined && cachedETag !== undefined) {
        // first check if the cache is expired
        const headResponse = await fetch(API_URL, {
            method: "HEAD"
        });

        if (headResponse.ok) {
            const etag = headResponse.headers.get("etag");

            if (etag === cachedETag) {
                return cachedData;
            }

            // if cache misses, proceed to the following steps to re-fetch the data
        }
    }

    const response = await fetch(API_URL);
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
