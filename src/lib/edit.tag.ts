import { Account } from "@tago-io/sdk";
import { TagsObj } from "@tago-io/sdk/out/common/common.types";

/**
 * Creates a resolver to add/update tags on the devices.
 * It automatically identifies if the tag already exists or not.
 * @example
 * const { tags } = await account.devices.info(deviceID);
 * const editTags = TagResolver(tags);
 * editTags.setTag("device_status", "ON");
 * await editTags.apply(account, deviceID);
 *
 * @param {TagsObj[]} rawTags list of your device existing Tags
 * @param debug
 * @returns
 */
function TagResolver(rawTags: TagsObj[], debug: boolean = false) {
  const tags = JSON.parse(JSON.stringify(rawTags)) as TagsObj[];

  const tagResolver = {
    /**
     * Set the Tag for your Device
     * @param {string} key key of the Tag
     * @param {string} value value of the Tag
     * @returns
     */
    setTag: function (key: string, value: string) {
      if (typeof key !== "string") {
        throw "[TagResolver] key is not a string";
      }
      if (typeof value !== "string") {
        throw "[TagResolver] key is not a string";
      }
      const tagExist = tags.find((x) => x.key === key);
      if (tagExist) {
        tagExist.value = value;
      } else {
        tags.push({ key, value });
      }
      return this;
    },

    /**
     * Apply the changes to the tags
     * @param {Account} account
     * @param {string} deviceID
     * @returns
     */
    apply: async function (account: Account, deviceID: string) {
      if (!(account instanceof Account)) {
        throw "[TagResolver] account is not an instance of TagoIO Account";
      }
      if (debug) {
        return tags;
      }
      await account.devices.edit(deviceID, { tags });
    },
  };

  return tagResolver;
}

export { TagResolver };
