'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function tempPathFor(file) {
  return path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`
  );
}

async function atomicWriteFile(file, data, options = {}) {
  const encoding = options.encoding || 'utf8';
  const mode = options.mode == null ? 0o600 : options.mode;
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temp = tempPathFor(file);
  let handle = null;
  try {
    handle = await fs.promises.open(temp, 'w', mode);
    if (Buffer.isBuffer(data)) await handle.writeFile(data);
    else await handle.writeFile(data, encoding);
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.promises.rename(temp, file);
  } catch (err) {
    if (handle) {
      try { await handle.close(); } catch (_) {}
    }
    try { await fs.promises.unlink(temp); } catch (_) {}
    throw err;
  }
}

async function atomicWriteJson(file, value, options = {}) {
  const spacing = options.pretty === false ? 0 : 2;
  return atomicWriteFile(file, JSON.stringify(value, null, spacing), options);
}

module.exports = {
  atomicWriteFile,
  atomicWriteJson,
  _test: { tempPathFor }
};
