import { Data } from "@tago-io/sdk/out/common/common.types";

/**
 * Convert a data { location, value } to "lat,lng;label"
 */
function convertLocationDataToString(data?: Data) {
  if (!data?.location || !data?.location?.coordinates) {
    return "";
  }

  return `${data.location.coordinates[1]},${data.location.coordinates[0]};${data.value}`;
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
