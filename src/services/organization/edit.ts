import { ServiceParams } from "../../types";
import { Data } from "@tago-io/sdk/out/common/common.types";

function getFormVariables(scope: Data[]) {
  const org_id = scope[0].group;

  const org_name = scope.find((x) => x.variable === "org_name");
  const org_address = scope.find((x) => x.variable === "org_address");

  if (!org_name.value) {
    throw "Organization name field is empty";
  }
  if (!org_id) {
    throw "Organization id is empty";
  }
  if (!org_address.value) {
    throw "Organization address field is empty";
  }

  return { org_name, org_id, org_address };
}

export default async ({ config_dev, scope, account }: ServiceParams) => {
  const { org_name, org_id, org_address } = getFormVariables(scope);
  console.debug(org_id);

  if (org_name) {
    // getting previous id data
    const [st_org_data] = await config_dev.getData({ variables: "org_id", qty: 1, groups: org_id });
    console.debug("before");
    console.debug(st_org_data);
    // deleting prev data in settings_device
    // await config_dev.deleteData({ id: st_org_data.id });

    // updating device name
    // await config_dev.sendData({ ...st_org_data, metadata: { ...st_org_data.metadata, label: org_name.value }, time: null });
    console.debug("after");
    await account.devices.edit(org_id, { name: org_name.value as string });

    // editting bucket name
    const bucket_id = (await account.devices.info(org_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: org_name.value as string });
    console.debug("to be edited device");
    console.debug(
      await account.devices.list({
        amount: 9999,
        page: 1,
        filter: {
          tags: [
            { key: "organization_id", value: org_id },
            { key: "device_type", value: "organization" },
          ],
        },
        fields: ["name", "bucket"],
      })
    );
    console.debug("======");
    console.debug(await config_dev.getData({ variables: "org_name", groups: org_id }));
  }
  if (org_address) {
    // updating data
    // await config_dev.sendData(org_address); //?

    // getting previous data
    const [org_id_data] = await config_dev.getData({ variables: "org_id", qty: 1, groups: org_id });
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: org_id_data.id });
    // updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_address.value as string }, time: null });
  }
  return console.debug("edited!");
};

export { getFormVariables };
