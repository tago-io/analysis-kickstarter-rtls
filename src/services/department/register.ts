import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_dept_name: string;
  org_id: string;
}

async function installDevice({ account, new_dept_name, org_id }: installDeviceParam) {
  //structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dept_name,
  };

  //creating new device
  const new_dept = await account.devices.create(device_data);

  //inserting device id -> so we can reference this later
  await account.devices.edit(new_dept.device_id, {
    tags: [
      { key: "department_id", value: new_dept.device_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "department" },
    ],
  });

  //instantiating new device
  const new_org_dev = new Device({ token: new_dept.token });

  //token, device_id, bucket_id
  return { ...new_dept, device: new_org_dev } as DeviceCreated;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log("Registering...");
  //Collecting data
  // const new_dept_org = scope.find((x) => x.variable === "new_dept_org");
  const new_dept_name = scope.find((x) => x.variable === "new_dept_name");
  const new_dept_address = scope.find((x) => x.variable === "new_dept_address");

  const org_id = scope[0].origin as string;

  //validation
  const validate = validation("dept_validation", org_dev);

  if (!new_dept_name.value) throw validate("Name field is empty", "danger");
  if ((new_dept_name.value as string).length < 3) throw validate("Name field is smaller than 3 char.", "danger");
  if (!new_dept_address.value) throw validate("Address field is empty", "danger");

  const [dept_exists] = await org_dev.getData({ variable: "dept_name", value: new_dept_name.value, qty: 1 }); /** */

  if (dept_exists) throw validate("Department already exists", "danger");

  //need device id to configure serie in parseTagoObject
  //creating new device
  const { device_id: dept_id, device } = await installDevice({ account, new_dept_name: new_dept_name.value as string, org_id });

  const dept_data = {
    dept_id: { value: dept_id, metadata: { label: new_dept_name.value } },
    dept_name: {
      value: new_dept_name.value,
      metadata: { url: `https://admin.tago.io/dashboards/info/5fc91ac2a0e14a002654fe99?org_device=${org_id}&dept_device=${dept_id}` },
    }, //dept_name.value widget?
    dept_address: { value: new_dept_address.value, location: new_dept_address.location },
    // dept_org: new_dept_org.value,
  };

  //send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(parseTagoObject(dept_data, dept_id));

  //send to organization device
  await org_dev.sendData(parseTagoObject(dept_data, dept_id));

  const dept_device = await getDevice(account, dept_id);
  console.log(dept_device);

  return validate("Department created", "success");
};
