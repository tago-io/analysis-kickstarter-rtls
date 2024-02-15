import { csv2json } from "json-2-csv";

/**
 * Fix the keys of the object to be lowercase and replace spaces with underscores.
 * @param item
 * @returns
 */
function fixKeys(item: any) {
  return Object.keys(item).reduce((final, key) => {
    const new_key = key.replaceAll(" ", "_").toLowerCase();
    final[new_key] = item[key];
    return final;
  }, {} as any);
}

/**
 * Convert a CSV string to a JSON array.
 */
async function convertCSV(data_csv: string) {
  const options = {
    trimFieldValues: true,
    trimHeaderFields: true,
  };
  const result = await csv2json(data_csv, options);

  return result.map((item) => fixKeys(item));
}

export { convertCSV };
