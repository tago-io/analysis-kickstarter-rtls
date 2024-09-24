import { expect } from "vitest";

import { getAssetHistoryInside, getAssetInfoInside } from "../../services/equipment/tracking/indoor-tracking";
import { getAssetInfoOutside } from "../../services/equipment/tracking/outdoor-tracking";
import { enviroment, equip_icon, equip_img, equipment, layer, scope, site_id, site_name, strongest_beacon } from "./mocks/getAssetInfoInside.mock";

test("getAssetInfoInside", () => {
  const result = getAssetInfoInside(
    scope as any,
    strongest_beacon,
    enviroment,
    site_id,
    equipment as any,
    layer as any,
    site_name,
    equip_icon as any,
    equip_img as any
  );
  expect(result).toEqual({
    equipment_location: {
      value: "Equipment 1",
      metadata: {
        layer: "group_id",
        x: 1,
        y: 1,
        site_name: "site_name",
        floor_name: "layer_name",
        site_id: "site_id",
        layer_id: "layer_id",
        icon: "icon_url",
        url: "https://admin.tago.io/dashboards/info/dash_id?site_dev=site_id&asset_dev=device_id",
        img_pin: "img_url",
      },
    },
  });
});

test("getAssetHistoryInside", () => {
  const result = getAssetHistoryInside(strongest_beacon, equipment as any, layer as any, site_name, equip_icon as any);
  expect(result).toEqual({
    asset_history: {
      value: "Equipment 1",
      metadata: {
        layer: "group_id",
        x: 1,
        y: 1,
        site: "site_name",
        floor: "layer_name",
        layer_id: "layer_id",
        icon: "icon_url",
      },
    },
  });
});

test("getPlotBasicImageMarker", () => {
  const result = getPlotBasicImageMarker(scope as any, layer as any);
  expect(result).toEqual({
    layers: {
      id: "layer_id",
      value: "layer_name",
      group: "group_id",
      metadata: {
        icon: "icon_url",
      },
    },
  });
});

test("getAssetInfoOutside", () => {
  const result = getAssetInfoOutside(enviroment as any, site_id, equipment as any);
  expect(result).toEqual({
    equipment_location: {
      value: "Equipment 1",
      metadata: {
        site_name: "site_name",
        site_id: "site_id",
        icon: "icon_url",
        url: "https://admin.tago.io/dashboards/info/dash_id?site_dev=site_id&asset_dev=device_id",
        img_pin: "img_url",
      },
    },
  });
});

test("getAssetHistoryOutside", () => {
  const result = getAssetHistoryOutside(equipment as any);
  expect(result).toEqual({
    asset_history: {
      value: "Equipment 1",
      metadata: {
        site: "site_name",
        icon: "icon_url",
      },
    },
  });
});
