"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const sdk_1 = require("@tago-io/sdk");
const scriptList = {
    analysisAssetTracking: "5fe0fad942fbde001f84752a",
    analysisHandler: "5fc6566af4b03200279988a9",
    analysisDeviceUpdater: "6059dd815215200013ec75a3"
};
(async () => {
    const account = new sdk_1.Account({ token: "2a4889a4-7c89-4278-b2b9-6fcd30eabd6d" });
    for (const script_name in scriptList) {
        console.log(`\nBuilding ${script_name}.ts`);
        child_process_1.execSync(`analysis-builder src/${script_name}.ts ./build/${script_name}.tago.js`, { stdio: "inherit" });
        const script = await fs_1.promises.readFile(`build/${script_name}.tago.js`, { encoding: "base64" });
        console.log();
        await account.analysis
            .uploadScript(scriptList[script_name], {
            content: script,
            language: "node",
            name: `${script_name}.tago.js`,
        })
            .then(() => console.log(`\n> Script ${script_name}.ts successfully uploaded to TagoIO!`), console.log);
    }
})();
