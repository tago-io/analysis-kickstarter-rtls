import { DataToSend } from "@tago-io/sdk/out/modules/Device/device.types";

// ? ==================================== (c) TagoIO ====================================
// ? What is this file?
// * This file is all logics of parseit (example script).
// ? ====================================================================================

interface GenericBody {
  [index: string]: any;
}

function parseTagoObject(body: GenericBody, group?: string): DataToSend[] {
  if (!group) {
    group = String(Date.now());
  }
  if (Object.keys(body).length === 0) {
    throw "Nothing to parse";
  }
  return Object.keys(body)
    .map((item) => {
      return {
        variable: item,
        value: body[item]?.value ?? body[item],
        group,
        time: body[item]?.time ?? null,
        location: body[item]?.location ?? null,
        metadata: body[item]?.metadata ?? null,
      };
    })
    .filter((item) => item.value !== null && item.value !== undefined);
}

export { parseTagoObject };
