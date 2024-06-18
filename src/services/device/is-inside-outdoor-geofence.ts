import { isPointWithinRadius } from "geolib";

import { Data } from "@tago-io/sdk/lib/types";

import { Geofence } from "./is-inside-indoor-geofence";

/* indoor geofence example:
{
  coordinates: { x: 0.705078125, y: 0.4657118055555556 },
  radius: 0.42361311225904824,
  type: 'circle',
  value: 'Geofence #1',
  event: 'a7b0c60i45h',
  eventDescription: 'leave geofence',
  eventColor: 'blue',
  layer: 'XA9J-vYvyHVdiNmfo766F',
  id: 'CggrO145U2aMgrExVgsL3'
}
*/

/**
 * The function checks if our device is inside a polygon geofence
 * @param point Point on map, latitude and longitude
 * @param geofence List of the geofences
 */
function insidePolygon(point: [number, number], geofence: Data["metadata"]) {
  if (!geofence) {
    throw "Invalid geofence";
  }
  const x = point[1];
  const y = point[0];
  let inside = false;
  for (let i = 0, j = geofence.length - 1; i < geofence.length; j = i++) {
    const xi = geofence[i][0];
    const yi = geofence[i][1];
    const xj = geofence[j][0];
    const yj = geofence[j][1];
    const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function getGeofenceResult(check_list: boolean[], geofence_list: Data["metadata"][]): Geofence[] {
  return check_list
    .map((x, index) => {
      if (!x) {
        return;
      }

      return geofence_list[index];
    })
    .filter((x) => x) as any;
}

/**
 * The function checks if our device is inside any geofence
 * @param point Point on map, latitude and longitude
 * @param geofence_list List of the geofences
 */
function getInsideOutdoorGeofence(point: [number, number], geofence_list: Data["metadata"][]): Geofence {
  let geofences: Geofence[] = [];

  // The line below gets all Polygon geofences that we may have.
  const polygons = geofence_list.filter((x) => x?.geolocation.type === "Polygon");
  if (polygons.length > 0) {
    // Here we check if our device is inside any Polygon geofence using our function above.
    const pass_check = polygons.map((x) => insidePolygon(point, x?.geolocation.coordinates[0]));
    geofences = geofences.concat(getGeofenceResult(pass_check, polygons));
  }

  // The line below gets all Point (circle) geofences that we may have.
  const circles = geofence_list.filter((x) => x?.geolocation.type === "Point");

  if (circles.length === 0) {
    return geofences[0];
  }

  // Here we check if our device is inside any Point geofence using a third party library called geolib.
  const pass_check = circles.map((x) =>
    isPointWithinRadius(
      { latitude: point[0], longitude: point[1] },
      {
        latitude: x?.geolocation.coordinates[0],
        longitude: x?.geolocation.coordinates[1],
      },
      x?.geolocation.radius
    )
  );

  // return the first geofence that is pass_check true, do not return a array
  geofences = geofences.concat(getGeofenceResult(pass_check, circles));
  return geofences[0];
}

export { getInsideOutdoorGeofence };
