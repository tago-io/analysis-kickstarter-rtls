import { DataToSend } from "@tago-io/sdk/lib/types";

/**
 * Convert a TagoIO Data { location, value } to "lat,lng;label"
 * @example
 * ```
 * const data = {
 *  location: { coordinates: [37.7749, -122.4194], type: "point" },
 *  value: "123 Main St"
 * };
 * const result = convertLocationDataToString(data);
 * console.log(result); // "-122.4194,37.7749;123 Main St"
 * ```
 */
function convertLocationDataToString(data?: Partial<DataToSend> | { [key: string]: any }) {
  if (!data?.location) {
    return "";
  }

  if (!("coordinates" in data.location) && !("lat" in data.location)) {
    return "";
  }

  if ("coordinates" in data.location) {
    return `${data.location.coordinates[1]},${data.location.coordinates[0]};${data.value}`;
  }

  return `${data.location.lat},${data.location.lng};${data.value}`;
}

/**
 * Convert a param location "lat,lng;label" to { coordinates, value }
 */
function convertLocationParamToObj(paramValue?: string) {
  if (!paramValue) {
    return undefined;
  }

  const [coords, label] = paramValue.split(";");
  if (!coords || !label) {
    return undefined;
  }

  const [lat, lng] = coords.split(",").map((x) => Number(x));

  return { location: { coordinates: [lat, lng], type: "point" }, value: label };
}

export { convertLocationDataToString, convertLocationParamToObj };
