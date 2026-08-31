'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SEMVER_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const REQUIRED_FILES = [
  'LICENSE',
  'NOTICE',
  'THIRD-PARTY-NOTICES.md',
  'RELEASE-VERIFICATION.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'RELEASE-2.5.md',
  '.github/workflows/release.yml'
];

function parseTag(tag) {
  const value = String(tag || '').trim();
  const match = SEMVER_TAG.exec(value);
  if (!match) throw new Error(`Release tag must match vMAJOR.MINOR.PATCH exactly: ${value || '(empty)'}`);
  return { tag: value, version: `${match[1]}.${match[2]}.${match[3]}` };
}

function readPackage(root = path.join(__dirname, '..')) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function assertTagMatchesPackage(tag, pkg) {
  const parsed = parseTag(tag);
  if (!pkg || typeof pkg.version !== 'string') throw new Error('package.json version is missing.');
  if (parsed.version !== pkg.version) {
    throw new Error(`Tag/package version mismatch: ${parsed.tag} vs package ${pkg.version}`);
  }
  return parsed;
}

function assertRequiredFiles(root) {
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length) throw new Error(`Missing required release files: ${missing.join(', ')}`);
}

function assertArtifactTemplates(pkg) {
  const winName = pkg?.build?.win?.artifactName;
  const linuxName = pkg?.build?.linux?.artifactName;
  if (winName !== 'SafeLedger-${version}-Portable.${ext}') {
    throw new Error(`Unexpected Windows artifact template: ${winName || '(missing)'}`);
  }
  if (linuxName !== 'SafeLedger-${version}-x86_64.${ext}') {
    throw new Error(`Unexpected Linux artifact template: ${linuxName || '(missing)'}`);
  }
}

function assertMasterAncestry(root) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/master'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'pipe']
    });
  } catch (err) {
    const detail = err.stderr ? String(err.stderr).trim() : err.message;
    throw new Error(`Tagged commit is not reachable from origin/master: ${detail}`);
  }
}

function validateReleasePolicy(options = {}) {
  const root = options.root || path.join(__dirname, '..');
  const pkg = options.pkg || readPackage(root);
  const tag = options.tag || process.env.GITHUB_REF_NAME;
  const parsed = assertTagMatchesPackage(tag, pkg);
  assertRequiredFiles(root);
  assertArtifactTemplates(pkg);
  if (options.requireMasterAncestry) assertMasterAncestry(root);
  return Object.freeze({ tag: parsed.tag, version: parsed.version });
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  if (process.env.GITHUB_REF_TYPE && process.env.GITHUB_REF_TYPE !== 'tag') {
    throw new Error(`Official release policy may run only in tag context; got ${process.env.GITHUB_REF_TYPE}.`);
  }
  const result = validateReleasePolicy({ root, requireMasterAncestry: process.env.GITHUB_ACTIONS === 'true' });
  console.log(`PASS release policy: ${result.tag} matches package ${result.version} and required trust files are present.`);
}

module.exports = {
  SEMVER_TAG,
  REQUIRED_FILES,
  parseTag,
  assertTagMatchesPackage,
  assertRequiredFiles,
  assertArtifactTemplates,
  validateReleasePolicy
};
