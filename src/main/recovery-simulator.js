'use strict';

const SCENARIOS = Object.freeze([
  Object.freeze({ id: 'device-lost', title: 'I lose a hardware wallet or device', icon: 'fa-mobile', description: 'Checks whether documented recovery material, location, and instructions are sufficient to replace a lost device.' }),
  Object.freeze({ id: 'safeledger-device-lost', title: 'My SafeLedgerData device fails', icon: 'fa-usb', description: 'Checks whether a separately verified encrypted backup exists.' }),
  Object.freeze({ id: 'location-unavailable', title: 'My primary recovery location is unavailable', icon: 'fa-home', description: 'Checks whether recovery and backup locations are documented separately enough to avoid one physical point of failure.' }),
  Object.freeze({ id: 'family-access', title: 'My family needs to recover without me', icon: 'fa-users', description: 'Checks beneficiary/contact coverage plus recovery instructions and locations.' }),
  Object.freeze({ id: 'exchange-lockout', title: 'I lose access to an exchange account', icon: 'fa-exchange', description: 'Checks whether exchange accounts have documented recovery paths.' })
]);

function ratio(done, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(done) / Number(total)) * 100)));
}

function statusFor(score) {
  return score >= 90 ? 'Ready' : score >= 60 ? 'Needs Review' : 'Incomplete';
}

function result(id, score, headline, strengths = [], gaps = []) {
  return Object.freeze({ id, score, status: statusFor(score), headline, strengths: Object.freeze(strengths), gaps: Object.freeze(gaps) });
}

function simulate(id, facts = {}, backupHealth = null) {
  const total = Number(facts.vaultItems) || 0;
  if (id === 'device-lost') {
    const method = ratio(facts.recoveryMethod, total);
    const location = ratio(facts.recoveryLocation, total);
    const instructions = ratio(facts.recoveryInstructions, total);
    const score = Math.round((method * .35) + (location * .30) + (instructions * .35));
    return result(id, score,
      total ? `${Math.min(facts.recoveryMethod || 0, facts.recoveryLocation || 0, facts.recoveryInstructions || 0)} of ${total} Vault Items have all three core recovery ingredients documented.` : 'No Vault Items are documented yet.',
      [method === 100 ? 'Recovery methods are documented for every Vault Item.' : '', location === 100 ? 'Recovery locations are documented for every Vault Item.' : '', instructions === 100 ? 'Recovery instructions are documented for every Vault Item.' : ''].filter(Boolean),
      [method < 100 ? `${total - (facts.recoveryMethod || 0)} Vault Item(s) still need a recovery method.` : '', location < 100 ? `${total - (facts.recoveryLocation || 0)} Vault Item(s) still need a recovery location.` : '', instructions < 100 ? `${total - (facts.recoveryInstructions || 0)} Vault Item(s) still need written recovery instructions.` : ''].filter(Boolean));
  }

  if (id === 'safeledger-device-lost') {
    const backup = backupHealth && backupHealth.backup;
    const verified = backupHealth && backupHealth.verified;
    const backupCurrent = backup && backup.state === 'current';
    const verifiedCurrent = verified && verified.state === 'current';
    const score = verifiedCurrent ? 100 : backupCurrent ? 65 : 20;
    return result(id, score,
      verifiedCurrent ? 'A current encrypted backup has been independently verified.' : backupCurrent ? 'A recent encrypted backup exists, but its latest verification is due or missing.' : 'A current verified encrypted backup is not documented.',
      [backupCurrent ? 'A recent encrypted backup exists.' : '', verifiedCurrent ? 'The backup has been verified independently.' : ''].filter(Boolean),
      [!backupCurrent ? 'Create an encrypted backup on separate storage.' : '', !verifiedCurrent ? 'Run Verify Backup so recovery is proven, not assumed.' : ''].filter(Boolean));
  }

  if (id === 'location-unavailable') {
    const score = total ? ratio(facts.separateLocations, total) : 0;
    return result(id, score,
      total ? `${facts.separateLocations || 0} of ${total} Vault Items document recovery and backup locations that appear different.` : 'No Vault Items are documented yet.',
      [score === 100 ? 'Every Vault Item has distinct documented recovery and backup locations.' : ''].filter(Boolean),
      [score < 100 ? `${total - (facts.separateLocations || 0)} Vault Item(s) may still rely on one documented location or do not list both locations.` : ''].filter(Boolean));
  }

  if (id === 'family-access') {
    const beneficiary = ratio(facts.beneficiary, total);
    const instructions = ratio(facts.recoveryInstructions, total);
    const location = ratio(facts.recoveryLocation, total);
    const score = Math.round((beneficiary * .4) + (instructions * .35) + (location * .25));
    return result(id, score,
      total ? `${facts.beneficiary || 0} of ${total} Vault Items identify a beneficiary or recovery contact.` : 'No Vault Items are documented yet.',
      [beneficiary === 100 ? 'Every Vault Item names a beneficiary/recovery contact.' : '', instructions === 100 ? 'Written recovery instructions cover every Vault Item.' : ''].filter(Boolean),
      [beneficiary < 100 ? `${total - (facts.beneficiary || 0)} Vault Item(s) do not identify who should recover them.` : '', instructions < 100 ? `${total - (facts.recoveryInstructions || 0)} Vault Item(s) still need written instructions.` : '', location < 100 ? `${total - (facts.recoveryLocation || 0)} Vault Item(s) still need a recovery location.` : ''].filter(Boolean));
  }

  if (id === 'exchange-lockout') {
    const exchanges = Number(facts.exchanges) || 0;
    const documented = Number(facts.exchangesWithRecoveryPlan) || 0;
    const score = exchanges ? ratio(documented, exchanges) : 100;
    return result(id, score,
      exchanges ? `${documented} of ${exchanges} exchange account(s) have a documented recovery path.` : 'No exchange accounts are documented in this vault.',
      [exchanges === 0 ? 'No exchange-account dependency is documented.' : score === 100 ? 'Every exchange account has a recovery path documented.' : ''].filter(Boolean),
      [exchanges && score < 100 ? `${exchanges - documented} exchange account(s) still need recovery instructions, a recovery link, or another documented recovery method.` : ''].filter(Boolean));
  }

  return result(String(id || ''), 0, 'Choose a recovery scenario to evaluate it locally.', [], []);
}

module.exports = { SCENARIOS, simulate, _test: { ratio, statusFor, result } };