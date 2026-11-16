export const schemaSql = `
CREATE TABLE IF NOT EXISTS IndividualAccount (
  userId TEXT PRIMARY KEY,
  loginName TEXT NOT NULL UNIQUE,
  passwordHash BLOB NOT NULL,
  passwordSalt BLOB NOT NULL CHECK(length(passwordSalt) = 16),
  scryptN INTEGER NOT NULL CHECK(scryptN > 0),
  scryptR INTEGER NOT NULL CHECK(scryptR > 0),
  scryptP INTEGER NOT NULL CHECK(scryptP > 0),
  keyLength INTEGER NOT NULL CHECK(keyLength > 0),
  createdAt INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS ServerSession (
  sessionIdHash BLOB PRIMARY KEY CHECK(length(sessionIdHash) = 32),
  userId TEXT NOT NULL REFERENCES IndividualAccount(userId) ON DELETE CASCADE,
  csrfToken BLOB NOT NULL CHECK(length(csrfToken) = 32),
  createdAt INTEGER NOT NULL,
  lastSeenAt INTEGER NOT NULL,
  absoluteExpiresAt INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS ServerSession_userId_idx ON ServerSession(userId);
CREATE TABLE IF NOT EXISTS CurrentRoleGrant (
  userId TEXT NOT NULL REFERENCES IndividualAccount(userId) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('Requester', 'Reviewer')),
  grantedAt INTEGER NOT NULL,
  PRIMARY KEY(userId, role)
) STRICT;
CREATE TABLE IF NOT EXISTS ChangeRequest (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  requesterId TEXT NOT NULL REFERENCES IndividualAccount(userId) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('Draft', 'PendingReview', 'Approved', 'ChangesRequested')),
  version INTEGER NOT NULL CHECK(version > 0),
  latestReviewerExplanation TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS ChangeRequest_requester_status_idx ON ChangeRequest(requesterId, status);
CREATE INDEX IF NOT EXISTS ChangeRequest_status_idx ON ChangeRequest(status);
CREATE TABLE IF NOT EXISTS LoginAttempt (
  attemptId INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK(scope IN ('ip', 'login-ip')),
  bucketKey BLOB NOT NULL CHECK(length(bucketKey) = 32),
  attemptedAt INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS LoginAttempt_window_idx ON LoginAttempt(scope, bucketKey, attemptedAt);
`;