import RBush from "rbush";
import z from "zod";
import { GeoJSON2DPointSchema, GeoJSONFeatureGenericSchema } from "zod-geojson";
import { FeaturePropertySchema } from "./types";

const GeoPointSchema = GeoJSONFeatureGenericSchema(z.array(z.number()), FeaturePropertySchema, GeoJSON2DPointSchema)
type GeoPoint = z.infer<typeof GeoPointSchema>;

export class GeoPointRBush extends RBush<GeoPoint> {
    toBBox(p: GeoPoint) {
        return {
            minX: p.geometry.coordinates[0],
            minY: p.geometry.coordinates[1],
            maxX: p.geometry.coordinates[0],
            maxY: p.geometry.coordinates[1],
        };
    }
    compareMinX(a: GeoPoint, b: GeoPoint) {
        return a.geometry.coordinates[0] - b.geometry.coordinates[0];
    }
    compareMinY(a: GeoPoint, b: GeoPoint) {
        return a.geometry.coordinates[1] - b.geometry.coordinates[1];
    }
}
