import type { SqliteDatabase } from './database.js';
export type AttemptScope='ip'|'login-ip';
export class LoginAttemptStore {
  constructor(private readonly db:SqliteDatabase){}
  reserve(ipKey:Buffer,loginIpKey:Buffer,now:number):{allowed:boolean;retryAfterSeconds?:number}{
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('DELETE FROM LoginAttempt WHERE attemptedAt < ?').run(now-24*60*60_000);
      const cutoff=now-15*60_000;
      const ip=this.db.prepare('SELECT attemptedAt FROM LoginAttempt WHERE scope=? AND bucketKey=? AND attemptedAt>? ORDER BY attemptedAt').all('ip',ipKey,cutoff) as {attemptedAt:number}[];
      const pair=this.db.prepare('SELECT attemptedAt FROM LoginAttempt WHERE scope=? AND bucketKey=? AND attemptedAt>? ORDER BY attemptedAt').all('login-ip',loginIpKey,cutoff) as {attemptedAt:number}[];
      const rejectedAt=ip.length>=60?ip[0]?.attemptedAt:pair.length>=10?pair[0]?.attemptedAt:undefined;
      if(rejectedAt!==undefined){this.db.exec('COMMIT');return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((rejectedAt+15*60_000-now)/1000))};}
      this.db.prepare('INSERT INTO LoginAttempt(scope,bucketKey,attemptedAt) VALUES (?,?,?)').run('ip',ipKey,now);
      this.db.prepare('INSERT INTO LoginAttempt(scope,bucketKey,attemptedAt) VALUES (?,?,?)').run('login-ip',loginIpKey,now);
      this.db.exec('COMMIT');return {allowed:true};
    }catch(error){if(this.db.inTransaction)this.db.exec('ROLLBACK');throw error;}
  }
  clearPair(key:Buffer):void{this.db.prepare('DELETE FROM LoginAttempt WHERE scope=? AND bucketKey=?').run('login-ip',key);}
}