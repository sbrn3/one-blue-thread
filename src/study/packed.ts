import { toByteArray } from 'base64-js';
import { gunzipSync, strFromU8 } from 'fflate';

export function decode<T>(encoded:string):T {
  return JSON.parse(strFromU8(gunzipSync(toByteArray(encoded)))) as T;
}
