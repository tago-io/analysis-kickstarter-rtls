import { Utils, Services, Account, Device, Types, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { ServiceParams, TagoContext, ServicesAnalysis } from "./types";

const servicesCollection = Promise.all([import("./services/customer"), import("./services/device")]) as Promise<ServicesAnalysis[]>;

async function handler(context: TagoContext, scope: Data[]): Promise<void> {
  context.log(JSON.stringify(scope));
  context.log("Running Analysis");

  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }

  if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const config_dev = new Device({ token: environment.config_token });
  const account = new Account({ token: environment.account_token });
  const notification = new Services({ token: context.token }).Notification;

  const serviceParams: ServiceParams = { context, account, config_dev, scope, notification, environment };

  const service = (await servicesCollection).find((x) => x.checkType(scope, environment));
  if (service) {
    await service.controller(serviceParams);
  }
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
    context.log("Analysis finished");
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

export default new Analysis(startAnalysis, { token: "token" });
