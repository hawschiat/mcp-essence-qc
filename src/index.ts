import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { findStationsWithinRadius } from "./data-source";
import {GasType, GasTypeSchema} from "./types";

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
    },
}, async ({ longitude, latitude, radiusKm, targetGasType, sortOrder, distanceFactor, priceFactor }) => {
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
            ]
        };
    }

    const formattedStations = stations.map((station) => [
        `Coordinates: (${station.coordinates.join(",")})`,
        `Distance from ${currentCoordinatesFormatted}: ${station.distance}km`,
        `Name: ${station.Name}`,
        `Brand: ${station.brand}`,
        `Prices: ${station.Prices.filter(p => p.IsAvailable)
            .map(price => `${price.Price} (${price.GasType})`)
            .join(', ')}`,
        `Address: ${station.Address}`,
        `Relevance score: ${station.score}`,
        "---------"
    ].join("\n"));

    const resultText = `Here are a list of stations matching the parameters:\n\n${formattedStations.join("\n")}`;

    return {
        content: [
            {
                type: "text",
                text: resultText,
            }
        ]
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Essence QC MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});