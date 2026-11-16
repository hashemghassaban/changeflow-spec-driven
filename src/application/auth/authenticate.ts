import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../../persistence/database.js';
import { inImmediateTransaction } from '../../persistence/transaction.js';
import type { PasswordCredential } from '../../domain/account.js';
import { dummyPasswordCredential, verifyPassword } from './password-hasher.js';
import { SessionService } from './session-service.js';
import { LoginAttemptLimiter } from './login-attempt-limiter.js';
export interface LoginResult { readonly userId:string; readonly sessionToken:string; readonly csrfToken:string }
export class AuthService{
 constructor(private readonly db:SqliteDatabase,private readonly sessions:SessionService,private readonly limiter:LoginAttemptLimiter){}
 async login(loginName:string,password:string,ip:string):Promise<LoginResult|null>{
  const reserved=this.limiter.reserve(loginName,ip);if(!reserved.allowed){const error=new Error('Too many login attempts');(error as Error & {retryAfter:number}).retryAfter=reserved.retryAfterSeconds??1;throw error;}
  const account=this.db.prepare('SELECT userId,passwordHash,passwordSalt,scryptN,scryptR,scryptP,keyLength FROM IndividualAccount WHERE loginName=?').get(loginName) as ({userId:string}&PasswordCredential)|undefined;
  const valid=await verifyPassword(password,account??dummyPasswordCredential);if(!account||!valid)return null;
  this.limiter.clearAfterSuccess(loginName,ip);const issued=this.sessions.rotateAfterLogin(account.userId);return {userId:account.userId,sessionToken:issued.token,csrfToken:issued.csrfToken};
 }
}
export function ensureAccount(db:SqliteDatabase,userId:string,loginName:string,credential:PasswordCredential,now=Date.now()):void{inImmediateTransaction(db,()=>{db.prepare('INSERT INTO IndividualAccount(userId,loginName,passwordHash,passwordSalt,scryptN,scryptR,scryptP,keyLength,createdAt) VALUES (?,?,?,?,?,?,?,?,?)').run(userId,loginName,credential.passwordHash,credential.passwordSalt,credential.scryptN,credential.scryptR,credential.scryptP,credential.keyLength,now);});}
export const newUserId=()=>randomUUID();