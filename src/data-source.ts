import { GeoJSONSchema, type GeoJSON } from "zod-geojson";

let cachedETag: string | undefined = undefined;
let cachedData: GeoJSON | undefined = undefined;

const API_URL = "https://regieessencequebec.ca/stations.geojson.gz";

async function fetchData(): Promise<GeoJSON> {
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
    const parsedData = GeoJSONSchema.parse(body);

    // save cache
    cachedData = parsedData;
    cachedETag = response.headers.get("etag") || undefined;

    return parsedData;
}
