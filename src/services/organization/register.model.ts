import z from "zod";

const locationModel = z.object({
  locationName: z.string({ required_error: "#LOCAT.EMPTY_NAME#" }),
  locationType: z.string({ required_error: "#LOCAT.EMPTY_TYPE#" }),
  locationAddress: z.string({ required_error: "#LOCAT.EMPTY_ADDRESS#" }),
  location: z.object(
    {
      value: z.string(),
      location: z.object({ coordinates: z.number().array().min(2) }).passthrough(),
    },
    { required_error: "#LOCAT.EMPTY_ADDRESS#" }
  ),
  locationGeofenceRadius: z.number({ required_error: "#LOCAT.EMPTY_GEOFENCE_RADIUS#" }).min(0, "#LOCAT.NEGATIVE_GEOFENCE_RADIUS#"),
  locationGeofenceUnit: z.enum(["km", "meters", "miles", "feet"], { required_error: "#LOCAT.EMPTY_UNIT#" }),
  locationSilenceAlarm: z.enum(["true", "false"], { required_error: "#LOCAT.EMPTY_SILENCE_ALARM#" }),
  locationGeofenceCompletion: z.enum(["true", "false"], { required_error: "#LOCAT.EMPTY_GEOFENCE_COMPLETION#" }),
  locationCompletionDelay: z.number().min(0).default(0),
  locationGeofenceCompletionLight: z.enum(["true", "false"], { required_error: "#LOCAT.EMPTY_GEOFENCE_COMPLETION_LIGHT#" }),
  locationLightDelay: z.number().min(0).default(0),
});

type ILocationModel = z.infer<typeof locationModel>;

export { locationModel, ILocationModel };
