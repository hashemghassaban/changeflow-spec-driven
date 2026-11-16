import {ChangeRequestError} from '../../domain/errors.js';
export function parseIfMatch(value:string|undefined):number|undefined{if(!value)return undefined;const match=/^"(\d+)"$/.exec(value.trim());if(!match)throw new ChangeRequestError('PRECONDITION_FAILED','If-Match is invalid');return Number(match[1]);}
export function etag(version:number):string{return `"${version}"`;}