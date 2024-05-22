// ? ==================================== (c) TagoIO ====================================
// ? What is this file?
// * This file is global types, it's used to remove "implicitly has an 'any' type" errors.
// ? ====================================================================================

import { Device, Types } from "@tago-io/sdk";
import { RouterConstructor } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data } from "@tago-io/sdk/lib/types";

interface EnvironmentJSON {
  [key: string]: string;
}

interface Metadata {
  [key: string]: string | number | boolean | Metadata | void;
}

interface EnvironmentItem {
  key: string;
  value: string;
}

interface EnvironmentItemObject {
  [key: string]: string;
}

interface InputScope {
  id: string;
  created_at: Date;
  time: Date;
  bucket: string;
  variable: string;
  device: string;
  unit: string;
  group: string;
  value: string | number | boolean | void;
  metadata: Metadata;
}

type Token = string;
type AnalysisID = string;

interface TagoContext {
  token: Token;
  analysis_id: AnalysisID;
  environment: Types.AnalysisEnvironment;
  log: (...args: any[]) => void;
}

interface ServiceParams {
  context: TagoContext;
  config_dev: Device;
  notification: any;
  scope: Data[];
  environment: EnvironmentItemObject;
}

interface DeviceCreated {
  bucket_id: string;
  device_id: string;
  device: Device;
}

interface RouterConstructorCustomBtn extends Omit<RouterConstructor, "scope"> {
  scope: { device: string; displayValue: string; property: string; value: string }[];
}

export {
  RouterConstructorCustomBtn,
  ServiceParams,
  TagoContext,
  Token,
  AnalysisID,
  InputScope,
  EnvironmentItem,
  EnvironmentItemObject,
  Metadata,
  DeviceCreated,
  EnvironmentJSON,
};
