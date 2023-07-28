/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { isPointWithinRadius } from "geolib";
import { z } from "zod";

import { Account, Device, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { ActionInfo } from "@tago-io/sdk/out/modules/Account/actions.types";
import { ConfigurationParams } from "@tago-io/sdk/out/modules/Account/devices.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

import { ActionStructureParams } from "./register";
import { IAlertTrigger, sendAlert } from "./sendAlert";

type ILatitude = number;
type ILongitude = number;
interface IGeofenceMetadata {
  event: string;
  geolocation: {
    type: string;
    radius: number;
    coordinates: [ILongitude, ILatitude];
  };
  id: string;
  eventColor: string;
  eventDescription: string;
}
interface ILocationData {
  lat: ILatitude;
  lng: ILongitude;
}
interface IGeofenceAlert {
  coordinates: ILocationData;
  device_id: string;
}

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

function getGeofenceResult(check_list: boolean[], geofence_list: Data["metadata"][]): IGeofenceMetadata[] {
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
function checkZones(point: [number, number], geofence_list: Data["metadata"][]): IGeofenceMetadata[] {
  let geofences: IGeofenceMetadata[] = [];

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
    return geofences;
  }

  // Here we check if our device is inside any Point geofence using a third party library called geolib.
  const pass_check = circles.map((x) =>
    isPointWithinRadius(
      { latitude: point[1], longitude: point[0] },
      {
        latitude: x?.geolocation.coordinates[0],
        longitude: x?.geolocation.coordinates[1],
      },
      x?.geolocation.radius
    )
  );

  geofences = geofences.concat(getGeofenceResult(pass_check, circles));

  return geofences;
}

type IAlertToBeSent = Omit<IAlertTrigger, "data">;
/**
 * The function returns the list of alerts that are outside the geofence zone
 * @param account Account instanced class
 * @param outsideZones Zones that are outside the geofence
 * @param deviceParams Configuration parameter of the device
 * @param device_id Device id
 */
async function getAlertList(account: Account, outsideZones: IGeofenceMetadata[], deviceParams: ConfigurationParams[], device_id: string) {
  const alerts: IAlertToBeSent[] = [];

  for (const item of outsideZones) {
    const action_info: ActionInfo = await account.actions.info(item.event);
    if (!action_info) {
      console.debug(`Action not found ${item.event}`);
      continue;
    }
    if (!action_info.trigger || !action_info.tags) {
      throw "Invalid action";
    }

    const devices = action_info.trigger.map((x: any) => x.device).filter((x) => x);

    if (!devices.includes(device_id)) {
      continue;
    }

    const alertParam = deviceParams.find((param) => param.key === item.event);
    if (alertParam?.sent) {
      continue;
    }

    const send_to = action_info.tags
      .find((x) => x.key === "send_to")
      ?.value?.replace(/;/g, ",")
      .split(",");
    const action_type = action_info.tags
      .find((x) => x.key === "action_type")
      ?.value?.replace(/;/g, ",")
      .split(",");

    if (!send_to || !action_type) {
      throw "Invalid action type and send to";
    }
    const action_device = action_info.tags.find((x) => x.key === "device")?.value as string;

    await account.devices.paramSet(device_id, { ...alertParam, key: item.event, value: "geofence", sent: true });
    alerts.push({ action_id: item.event, send_to, type: action_type, device: action_device });
  }

  return alerts;
}

/**
 * Add this function to the analysis that is receiving the location variable somehow.
 * It can be used on statusUpdater or uplinkHandler, depending on how often you want to check the alert.
 * @param account Account instanced class
 * @param context Context of the analysis, to retrieve the token
 * @param locationData lat and lng of device current position
 */
async function geofenceAlertTrigger(account: Account, context: TagoContext, locationData: IGeofenceAlert, isInside: boolean) {
  const { coordinates, device_id } = locationData;
  console.log("geofenceAlertTrigger, Location data: ", locationData);

  // get param last_geofence
  const params = await account.devices.paramList(device_id);
  const last_geofence = params.find((param) => param.key === "last_geofence")?.value as string;

  // get site device so that we can get the geofence variables
  const { tags } = await account.devices.info(device_id);
  const site_id = tags.find((tag) => tag.key === "site_id")?.value as string;
  let geofences: Data[] = [];
  let site_dev: Device;

  // check if inside or outside
  if (site_id) {
    site_dev = await Utils.getDevice(account, site_id);
    let geofence_list = await site_dev.getData({ variables: "geofence_outdoor", qty: 100 });
    if (isInside) {
      geofence_list = await site_dev.getData({ variables: "geofence", qty: 100 });
    }
    console.debug(`${isInside == true ? "indoor" : "outdoor"} geofence_list`, geofence_list);

    geofence_list = geofence_list.map((x) => ({ ...x, metadata: { ...x.metadata, device: site_id } }));
    geofences = geofences.concat(geofence_list);
  }

  // Filter the geofences and send the alerts if any
  const geofenceMetadaList = geofences.map((geofences) => geofences.metadata) as IGeofenceMetadata[];

  const zones = checkZones([coordinates.lng, coordinates.lat], geofenceMetadaList);
  console.debug(`Sensor ${device_id} is inside the following ${isInside == true ? "indoor" : "outdoor"} geofences: \n ${zones}`);

  // check if equipement is inside of any geofence or if none.
  const insideGeofences = geofenceMetadaList.filter((x) => zones.find((y) => y.event === x.event)); // zones the sensor is inside of
  console.debug("Sensor is inside of geofences:", insideGeofences);

  // get geofence metadata.event (Action ID or group)
  return;
}

/**
 * Add this function to alert Handler in order to add the needed variable for geofence events
 * @param devToStoreAlert Organization/Group/Etc device that will have the event stored
 * @param action_id Id of the action
 * @param structure structure of the action
 */
async function geofenceAlertCreate(devToStoreAlert: Device, action_id: string, structure: ActionStructureParams) {
  const condition = structure.trigger_value as string;
  await devToStoreAlert.sendData({
    variable: "alert_geofence",
    value: structure.name,
    metadata: { color: condition.includes("Sair") || condition.includes("leave") ? "red" : "green" },
    group: action_id,
  });
}

/**
 * Add this function to alert Handler when editing geofence alerts.
 * @param devToStoreAlert Organization/Group/Etc device that will have the event stored
 * @param action_id Id of the action
 * @param structure structure of the action
 */
async function geofenceAlertEdit(devToStoreAlert: Device, action_id: string, structure: ActionStructureParams) {
  await devToStoreAlert.deleteData({ variables: "alert_geofence", groups: action_id });
  await geofenceAlertCreate(devToStoreAlert, action_id, structure);
}

export { IGeofenceAlert, geofenceAlertEdit, geofenceAlertCreate, geofenceAlertTrigger };
