# Command Line - List
Here's a command list you can use in your terminal to improve development at TagoIO.

- npm run **console** *\<AnalysisName>* - turn on console for an analysis, use name from config.ts
- npm run **deploy** *\<AnalysisName>* - deploy script to the analysis, use name from config.ts
- npm run **duplicate** *\<AnalysisName>* - duplicate an analysis, use name from config.ts
- npm run **trigger** *\<AnalysisName>* - trigger an analysis, use name from config.ts
- npm run **inspector** *\<DeviceID/Token>* - connect to device Live Inspector, use ID or Device-Token

# Choose specific environment
You can optionally enter the environment as first parameter. If the environment provided is found in the config.ts, it will be choosen automatically.

- npm run **console** *\<environment>*  *\<AnalysisName>* 
- npm run **deploy** *\<environment>*  *\<AnalysisName>* 
- npm run **duplicate** *\<environment>*  *\<AnalysisName>* 
- npm run **trigger** *\<environment>*  *\<AnalysisName>* 
- npm run **inspector** *\<environment>*  *\<DeviceID/Token>*
