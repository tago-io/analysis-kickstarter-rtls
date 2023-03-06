// ? ==================================== (c) TagoIO ====================================
// ? What is this file?
// * This file is global types, it's used to remove "implicitly has an 'any' type" errors.
// ? ====================================================================================

import { Account, Device, Types } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { RouterConstructor } from "@tago-io/sdk/out/modules/Utils/router/router.types";

interface ServicesAnalysis {
  checkType: (scope: Data[] | InputScope[], environment: EnvironmentItemObject) => void;
  controller: (params: ServiceParams) => void;
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
  environment: Types.Analysis.Analysis.AnalysisEnvironment[];
  log: (...args: any[]) => void;
}

interface ServiceParams {
  context: TagoContext;
  account: Account; // ! We need migrate SDK to better hightlight
  config_dev: Device; // ! We need migrate SDK to better hightlight
  notification: any; // ! We need migrate SDK to better hightlight
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
  ServicesAnalysis,
  ServiceParams,
  TagoContext,
  Token,
  AnalysisID,
  InputScope,
  EnvironmentItem,
  EnvironmentItemObject,
  Metadata,
  DeviceCreated,
};
