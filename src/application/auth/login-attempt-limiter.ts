import { createHmac } from 'node:crypto';
import { LoginAttemptStore } from '../../persistence/login-attempt-store.js';
export class LoginAttemptLimiter{
 constructor(private readonly store:LoginAttemptStore,private readonly key:Buffer,private readonly now:()=>number=Date.now){if(key.length!==32)throw new Error('Login HMAC key must be exactly 32 bytes');}
 private digest(scope:string,value:string){return createHmac('sha256',this.key).update(scope).update('\0').update(value,'utf8').digest();}
 reserve(loginName:string,ip:string){const ipKey=this.digest('ip',ip);const pairKey=this.digest('login-ip',`${loginName}\0${ip}`);return this.store.reserve(ipKey,pairKey,this.now());}
 clearAfterSuccess(loginName:string,ip:string){this.store.clearPair(this.digest('login-ip',`${loginName}\0${ip}`));}
}
export function requestClientIp(remoteAddress:string|undefined,forwardedFor:string|undefined,trustedProxyAddresses:readonly string[]):string{
 if(remoteAddress&&trustedProxyAddresses.includes(remoteAddress)&&forwardedFor){const first=forwardedFor.split(',')[0]?.trim();if(first)return first;}
 return remoteAddress??'unknown';
}