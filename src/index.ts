import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { findStationsWithinRadius } from "./data-source";
import { GasType, GasTypeSchema } from "./types";

// Create server instance
const server = new McpServer({
    name: "essence-qc",
    version: "1.0.0",
});

const zeroToOneSchema = z.number().min(0).max(1);

server.registerTool("query_gas_stations", {
    description: "Query for gas stations within a specified radius, optionally with type of gas to focus on.",
    inputSchema: {
        longitude: z.number().describe("Longitude"),
        latitude: z.number().describe("Latitude"),
        radiusKm: z.number().describe("Search radius, in kilometers").default(30),
        targetGasType: z.optional(GasTypeSchema)
            .describe("Type of gas to target on when sorting by prices.")
            .default(GasType.REGULAR),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        distanceFactor: zeroToOneSchema.clone()
            .describe("How important to consider distance when computing the relevance of a result. Must sum to 1 with `priceFactor`")
            .default(0.5),
        priceFactor: zeroToOneSchema.clone()
            .describe("How important to consider price when computing the relevance of a result. Must sum to 1 with `distanceFactor`")
            .default(0.5),
        cursor: z.string().default("0"),
        limit: z.number().default(20),
    },
    outputSchema: {
        stations: z.array(z.looseObject({
            coordinates: z.array(z.number()).length(2).describe("Coordinates (latitude, longitude)"),
            distance: z.number().describe("Distance from the provided coordinates"),
            Name: z.string().describe("Name of the station"),
            Brand: z.string().optional().describe("Brand of the station"),
            Prices: z.array(z.object({
                GasType: z.string().toLowerCase().describe("Type of gas (in French)"),
                Price: z.number().nullable().describe("Price of gas, if available"),
                IsAvailable: z.boolean(),
            })),
            Address: z.string().describe("Address of the station"),
            score: z.number().describe("Relevance score (lower is better)"),
        })).describe("List of stations matching the query"),
    }
}, async ({longitude, latitude, radiusKm, targetGasType, sortOrder, distanceFactor, priceFactor, cursor, limit }) => {
    const stations = await findStationsWithinRadius([longitude, latitude],
        { radiusKm, targetType: targetGasType },
        { order: sortOrder, distanceFactor, priceFactor }
    );

    const currentCoordinatesFormatted = `(${latitude}, ${longitude})`

    if (stations.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `Unable to find any stations within the ${radiusKm}km radius from ${currentCoordinatesFormatted}`
                }
            ],
            structuredContent: {
                stations: []
            }
        };
    }

    // slice to paginate results
    // TODO: use caching so we don't have to recompute for every pagination
    const offset = parseInt(cursor, 10);
    const page = stations.slice(offset, offset + limit);

    return {
        content: [],
        structuredContent: {
            stations: page,
        },
        nextCursor: `${offset + limit}`
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});