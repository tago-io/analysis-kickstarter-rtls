interface GeofenceCoordinates {
  x: number;
  y: number;
}
interface Geofence {
  type: string;
  coordinates: GeofenceCoordinates | GeofenceCoordinates[];
  radius?: number;
  value: string;
  event: string;
  eventColor: string;
  layer: string;
  eventDescription: string;
  id?: string; // added in this analysis
}

// This function checks if our device is inside a polygon geofence
function insidePolygon(point: [number, number], geofence: { x: number; y: number }[]) {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = geofence.length - 1; i < geofence.length; j = i++) {
    const xi = geofence[i].x;
    const yi = geofence[i].y;
    const xj = geofence[j].x;
    const yj = geofence[j].y;
    const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function checkRadius(point_x: number, point_y: number, circle_x: number, circle_y: number, r: number) {
  const dist_points = Math.sqrt((point_x - circle_x) * (point_x - circle_x) + (point_y - circle_y) * (point_y - circle_y));
  if (dist_points <= r) {
    return true;
  }
  return false;
}

// This function checks if our device is inside any geofence
function getInsideGeofence(point: [number, number], geofence_list: Geofence[], layerBeacon: string) {
  // The line below gets all Polygon geofences that we may have.
  const polygons = geofence_list.filter((x) => x.type === "polygon" && Array.isArray(x.coordinates));
  if (polygons.length > 0) {
    // Here we check if our device is inside any Polygon geofence using our function above.
    const pass_check = polygons.map((x) => insidePolygon(point, x.coordinates as GeofenceCoordinates[]));
    const index = pass_check.indexOf(true);
    if (index !== -1) {
      return polygons[index];
    }
  }

  // The line below gets all Point (circle) geofences that we may have.
  const circles = geofence_list.filter((x) => x.type === "circle" && !Array.isArray(x.coordinates));
  if (circles.length > 0) {
    // Here we check if our device is inside any Point geofence using a third party library called geolib.
    const pass_check = circles.map((x) => {
      const coordinates = x.coordinates as GeofenceCoordinates;
      if (x.layer === layerBeacon) {
        return checkRadius(point[0], point[1], coordinates.x, coordinates.y, x.radius as number);
      }
    });

    const index = pass_check.findIndex((x) => x);
    if (index !== -1) {
      return circles[index];
    }
  }
}

export { getInsideGeofence, Geofence, GeofenceCoordinates };
