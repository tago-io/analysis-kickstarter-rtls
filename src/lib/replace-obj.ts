import { cloneDeep } from "lodash";

type IReplaceObj = { [key: string]: string | number };

/**
 * Replace all values from an object
 * @example
 * ```
 * const obj = { a: "1234", b: "444", c: "6565" };
 * const result = replaceObj(obj, { 1234: "test", 444: "test2" });
 * console.log(result);
 * // { a: "test", b: "test2", c: "6565" }
 * ```
 * @param original
 * @param replacer
 * @returns
 */
function replaceObj(original: any, replacer: IReplaceObj) {
  let string_obj = JSON.stringify(cloneDeep(original));
  for (const key in replacer) {
    string_obj = string_obj.replaceAll(new RegExp(key, "g"), replacer[key] as any);
  }

  return JSON.parse(string_obj);
}

export { replaceObj, IReplaceObj };
