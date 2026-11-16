export interface PasswordCredential {
  readonly passwordHash: Buffer;
  readonly passwordSalt: Buffer;
  readonly scryptN: number;
  readonly scryptR: number;
  readonly scryptP: number;
  readonly keyLength: number;
}