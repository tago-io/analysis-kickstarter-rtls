import config from "../../config";

interface ConfigType {
  account_token: string;
  analysis_id: {
    [key: string]: string;
  };
}

function resolveEnviroment(argv: string[], enforcement: boolean = true): ConfigType {
  const cmd = argv.slice(2).map((x) => x.toLowerCase());
  if (cmd[0]) {
    if (cmd[0] in config) {
      return (config as any)[cmd[0]] as ConfigType;
    }

    if (enforcement) {
      throw `Environment ${cmd[0]} not found in src/config.json`;
    }
  }

  if (!config.default) {
    throw `Parameter default. Can't load environment. not found in src/config.json`;
  }

  console.info("// Enviroment not found, loading default");
  return (config as any)[config.default] as ConfigType;
}

export { resolveEnviroment };
