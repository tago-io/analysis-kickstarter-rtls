import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  org_id: string;
  site_id: string;
  connector: string;
  new_device_eui: string;
}

async function installDevice({ account, new_dev_name, org_id, site_id, connector, new_device_eui }: installDeviceParam) {
  //structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    network: "5ed7ccd5427104001cf00183",
    serie_number: new_device_eui,
    connector,
  };

  //creating new device
  const new_dev = await account.devices.create(device_data);

  //inserting device id -> so we can reference this later
  await account.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "device" },
    ],
  });

  //instantiating new device
  const new_org_dev = new Device({ token: new_dev.token });

  //token, device_id, bucket_id
  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log("Registering...");
  //Collecting data
  const new_dev_name = scope.find((x) => x.variable === "new_dev_name");
  const new_dev_eui = scope.find((x) => x.variable === "new_dev_eui");
  const new_dev_type = scope.find((x) => x.variable === "new_dev_type");
  const new_dev_site = scope.find((x) => x.variable === "new_dev_site");

  const org_id = scope[0].origin as string;

  //validation
  const validate = validation("dev_validation", org_dev);

  if (!new_dev_name.value) throw validate("Name field is empty", "danger");
  if ((new_dev_name.value as string).length < 3) throw validate("Name field is smaller than 3 char.", "danger");
  if (!new_dev_type.value) throw validate("Type field is empty", "danger");
  if (!new_dev_eui.value) throw validate("EUI field is empty", "danger");

  console.log(new_dev_type);

  const [dev_exists] = await org_dev.getData({
    variables: ["dev_eui", "dev_name"],
    values: [new_dev_eui.value, new_dev_name.value],
    qty: 1,
  });

  if (dev_exists) throw validate("Device already exists", "danger");

  //need device id to configure serie in parseTagoObject
  //creating new device
  const { device_id: dev_id, device } = await installDevice({
    account,
    new_dev_name: new_dev_name.value as string,
    org_id,
    site_id: new_dev_site.value as string,
    connector: new_dev_type.value as string,
    new_device_eui: new_dev_eui.value as string,
  });

  const device_type_name = (await account.integration.connectors.info(new_dev_type.value as string)).name;
  console.log(device_type_name);

  const dev_data = parseTagoObject(
    {
      dev_id: dev_id,
      dev_name: new_dev_name.value,
      dev_eui: new_dev_eui.value,
      dev_type: { value: new_dev_type.value, metadata: { label: device_type_name } },
      dev_site: new_dev_site.value,
    },
    dev_id
  );
  console.log(dev_data);

  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(dev_data);

  //send to organization device
  await org_dev.sendData(dev_data);

  //getting the site device
  const site_dev = await getDevice(account, new_dev_site.value as string);
  site_dev.sendData(dev_data);

  //Setting dev token as EUI

  return validate("Device created successfully!", "success");
};
