import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { findStationsWithinRadius } from "./data-source.js";
import { GasType, GasTypeSchema } from "./types.js";

// Create server instance
const server = new McpServer({
    name: "essence-qc",
    version: "1.0.0",
});

server.registerTool(
    "request_user_input",
    {
        description: "MANDATORY INITIALIZATION: Call this tool FIRST if the user is in Quebec or inquiring about Quebec " +
            "fuel prices. This tool ensures you do not guess sensitive location data. Do NOT proceed with data fetching " +
            "tools until the user has provided these parameters. Exceptions: Only skip if the user has ALREADY provided " +
            "these 4 parameters in their very first message.",
        inputSchema: {
            userInQuebec: z.boolean().describe("Set to true if the context suggests the user is in Quebec (e.g. mentions of Montreal, Longueuil, or local gas prices)."),
        }
    },
    async (args) => {
        // Hard-check the gate logic inside the function
        if (!args.userInQuebec) {
            return {
                content: [{
                    type: "text",
                    text: "This tool uses data only available in Quebec. If you are outside Quebec, please confirm you still wish to use Quebec-specific fuel data."
                }]
            };
        }

        return {
            content: [{
                type: "text",
                text: "Please prompt the user for the following search parameters. DO NOT guess the postal code or fuel consumption:\n\n" +
                    "1. Exact location (Postal code or specific intersection in Quebec)\n" +
                    "2. Search radius (Recommend 5-10km for urban areas)\n" +
                    "3. Target gas type (Regular, Midgrade, Premium, Diesel)\n" +
                    "4. Vehicle specs (Consumption in L/100km and typical fill-up volume in L)"
            }]
        };
    }
);

server.registerTool("query_gas_stations", {
    description: "Query for gas stations within a specified radius. Only call this AFTER calling request_user_input and " +
        "receiving a confirmed location + search parameters from the user.",
    inputSchema: {
        longitude: z.number().describe("User's confirmed longitude"),
        latitude: z.number().describe("User's confirmed latitude"),
        radiusKm: z.number().describe("Search radius, in kilometers").default(30),
        targetGasType: z.optional(GasTypeSchema)
            .describe("Type of gas to target on when sorting by prices.")
            .default(GasType.REGULAR),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        fuelConsumption: z.number()
            .describe("Fuel consumption, in litre/100km, defaults to 8.9, which is standard for mid-size SUV/crossover.")
            .default(8.9),
        fillUpVolume: z.number().describe("Fill up volume, defaults to 50L.").default(50),
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
            trueCost: z.number().describe("Cost of purchasing gas at this station, including round-trip fuel"),
        })).describe("List of stations matching the query, sorted by the cost of purchasing gas at this station."),
    }
}, async ({longitude, latitude, radiusKm, targetGasType, sortOrder, fuelConsumption, fillUpVolume, cursor, limit }) => {
    const stations = await findStationsWithinRadius([longitude, latitude],
        { radiusKm, targetType: targetGasType },
        { order: sortOrder, fuelConsumption, fillUpVolume }
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