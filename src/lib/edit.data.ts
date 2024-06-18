import { Resources } from "@tago-io/sdk";
import { Data, DataToEdit, DataToSend } from "@tago-io/sdk/lib/types";

/**
 * Creates a resolver to add/update data on the devices.
 * The function automatically identifies if the data already exists or not.
 * @example
 * const editData = DataResolver(deviceID);
 * editData.setVariable({ variable: "data-to-update", value: 1, group: "12312" });
 * await editData.apply();
 *
 * @param {Device} device your device instanced class
 * @param debug
 * @returns
 */
function DataResolver(deviceID: string, debug: boolean = false) {
  const variables: string[] = [];
  const newDataList: DataToSend[] = [];
  let oldDataList: Data[] = [];

  const addVariable = (variable: string) => {
    if (variables.includes(variable)) {
      return;
    }
    variables.push(variable);
  };

  const dataResolver = {
    /**
     * Data that will be added / updated in the Device.
     * @param {DataToSend} data
     * @returns this
     */
    setVariable: function (data: DataToSend) {
      if (!data.variable) {
        throw "[DataResolver] Missing variable key in data json";
      }
      addVariable(data.variable);
      newDataList.push(data);
      return this;
    },
    /**
     * Apply the changes to the device data.
     * @param {string | string[]} groups List of groups for when requesting Old Data list from the Device.
     * @returns
     */
    apply: async function (groups?: string | string[]) {
      if (!debug) {
        oldDataList = await Resources.devices.getDeviceData(deviceID, { variables, qty: 1, groups });
      }

      const toUpdate: DataToEdit[] = [];
      const toAdd: DataToSend[] = [];

      for (const item of newDataList) {
        const oldData = oldDataList.find((x) => x.variable === item.variable);
        if (oldData) {
          // check if any data has changed, like if a new key was added or it's value updated
          const hasChanged = Object.keys(item).some((key) => {
            if (key === "group") {
              return item.group !== oldData.group;
            }
            if (key === "unit") {
              return item.unit !== oldData.unit;
            }
            if (key === "time") {
              return item.time !== oldData.time;
            }
            if (key === "location") {
              return JSON.stringify(item.location) !== JSON.stringify(oldData.location);
            }
            if (key === "metadata") {
              return JSON.stringify(item.metadata) !== JSON.stringify(oldData.metadata);
            }
            if (key === "value") {
              return item.value !== oldData.value;
            }
            return false;
          });
          if (hasChanged) {
            toUpdate.push({ ...item, id: oldData.id });
          }
        } else {
          toAdd.push({ ...item, group: !Array.isArray(groups) ? groups : item.group });
        }
      }

      if (debug) {
        return { toAdd, toUpdate };
      }

      if (toUpdate.length > 0) {
        await Resources.devices.editDeviceData(deviceID, toUpdate);
      }

      if (toAdd.length > 0) {
        await Resources.devices.sendDeviceData(deviceID, toAdd);
      }
    },
    /**
     * Setup Old Data if you already have, avoid doing the request again.
     * @param {Data[]} dataList
     * @returns
     */
    setOldData: function (dataList: Data[]) {
      oldDataList = dataList;
      return this;
    },

    /**
     * Check if any data was set to be added/updated.
     * @returns {boolean} true if there is any change to be applied.
     */
    hasChanged: function () {
      return newDataList.length > 0;
    },

    _debug: function () {
      return { variables, newDataList };
    },
  };

  return dataResolver;
}

export { DataResolver };
