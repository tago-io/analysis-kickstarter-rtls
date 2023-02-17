import axios from "axios";

/**
 * Get the tago device class from the device id
 */
async function getImageBase64(url: string) {
  const result = await axios
    .get(url, { responseType: "arraybuffer" })
    .then((r) => Buffer.from(r.data))
    .catch(() => {
      return null;
    });

  if (!result) {
    return;
  }
  return result.toString("base64");
}

export { getImageBase64 };
