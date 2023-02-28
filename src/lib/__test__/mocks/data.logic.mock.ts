import { DataToSend } from "@tago-io/sdk/out/modules/Device/device.types";

const obj = {
  name: "stringValuee",
  user_amount: 2,
  active: { value: true, metadata: { color: "Green" } },
  device_amount: { value: 4, time: "2020-01-01T00:00:00.000Z" },
  location: { value: 5, time: "2020-01-01T00:00:00.000Z", location: { lat: 0, lng: 0 } },
};

const objResult: DataToSend[] = [
  {
    variable: "name",
    value: "stringValuee",
    group: "1588160000000",
    location: null,
  },
  {
    variable: "user_amount",
    value: 2,
    group: "1588160000000",
    location: null,
  },
  {
    variable: "active",
    value: true,
    group: "1588160000000",
    location: null,
    metadata: { color: "Green" },
  },
  {
    variable: "device_amount",
    value: 4,
    group: "1588160000000",
    time: "2020-01-01T00:00:00.000Z",
    location: null,
  },
  {
    variable: "location",
    value: 5,
    group: "1588160000000",
    time: "2020-01-01T00:00:00.000Z",
    location: { lat: 0, lng: 0 },
  },
];

export { obj, objResult };
