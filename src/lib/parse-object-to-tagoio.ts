// ? ==================================== (c) TagoIO ====================================
// ? What is this file?
// * This file is all logics of parseit (example script).
// ? ====================================================================================

import { DataToSend } from "@tago-io/sdk/lib/types";

interface GenericBody {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
}

function parseObjectToTago(body: GenericBody, group?: string): DataToSend[] {
  if (!group) {
    group = String(Date.now());
  }
  return Object.keys(body)
    .map((item) => {
      return {
        variable: item,
        value: body[item] instanceof Object ? body[item].value : body[item],
        group,
        time: body[item] instanceof Object ? body[item].time : null,
        location: body[item] instanceof Object ? body[item].location : null,
        metadata: body[item] instanceof Object ? body[item].metadata : null,
      };
    })
    .filter((item) => item.value !== null && item.value !== undefined);
}

export { parseObjectToTago };
