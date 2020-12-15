import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  new_dev_idcode: string;
  org_id: string;
  dept_id: string;
}

async function installDevice({ account, new_dev_name, new_dev_idcode, org_id, dept_id }: installDeviceParam) {
  //structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    serie_number: new_dev_idcode,
    network: "5bbd120d4051a50034cd1a05",
    connector: "5f5a8f3351d4db99c40deecf",
  };

  //creating new device
  const new_dev = await account.devices.create(device_data);

  //inserting device id -> so we can reference this later
  await account.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "department_id", value: dept_id },
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
  const new_dev_idcode = scope.find((x) => x.variable === "new_dev_idcode");
  // const new_dev_org = scope.find((x) => x.variable === "new_dev_org");
  const new_dev_dept = scope.find((x) => x.variable === "new_dev_dept");

  const org_id = scope[0].origin as string;

  //validation
  const validate = validation("dev_validation", org_dev);

  if (!new_dev_name.value) throw validate("Name field is empty", "danger");
  if ((new_dev_name.value as string).length < 3) throw validate("Name field is smaller than 3 char.", "danger");
  if (!new_dev_idcode.value) throw validate("ID Code field is empty", "danger");
  if (!new_dev_type.value) throw validate("Type field is empty", "danger");
  if (!new_dev_eui.value) throw validate("EUI field is empty", "danger");

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
    new_dev_idcode: new_dev_idcode.value as string,
    org_id,
    dept_id: new_dev_dept.value as string,
  });

  const dev_data = parseTagoObject(
    {
      dev_id: dev_id,
      dev_name: {
        value: new_dev_name.value,
        metadata: { url: `https://admin.tago.io/dashboards/info/5fc91ac2a0e14a002654fe99?org_dev=${org_dev}&dept_dev=${new_dev_dept.value}` },
      },
      dev_eui: new_dev_eui.value,
      dev_type: new_dev_type.value,
      dev_idcode: new_dev_idcode.value,
      dev_dept: new_dev_dept.metadata.label,
    },
    dev_id
  );

  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(dev_data);

  //send to organization device
  await org_dev.sendData(dev_data);

  //getting the department device
  const dept_dev = await getDevice(account, new_dev_dept.value as string);
  dept_dev.sendData(dev_data);

  return validate("Device created", "success");
};
