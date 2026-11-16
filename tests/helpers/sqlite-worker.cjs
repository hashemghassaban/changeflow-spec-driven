const Database = require('better-sqlite3');
const db = new Database(process.argv[2], { timeout: 5000 });
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
process.send({ type: 'ready', journal: db.pragma('journal_mode', { simple: true }), foreignKeys: db.pragma('foreign_keys', { simple: true }), busyTimeout: db.pragma('busy_timeout', { simple: true }) });
process.on('message', (message) => {
  try {
    if (message.type === 'hold') {
      db.exec('BEGIN IMMEDIATE');
      db.prepare('INSERT INTO probe (value) VALUES (?)').run('rolled-back');
      process.send({ type: 'locked' });
    } else if (message.type === 'release') {
      if (db.inTransaction) db.exec('ROLLBACK');
      process.send({ type: 'released', inTransaction: db.inTransaction, rows: db.prepare('SELECT value FROM probe').all() });
    } else if (message.type === 'exit') {
      if (db.inTransaction) db.exec('ROLLBACK');
      db.close();
      process.send({ type: 'closed' });
      process.disconnect();
    }
  } catch (error) {
    process.send({ type: 'error', message: error.message });
  }
});