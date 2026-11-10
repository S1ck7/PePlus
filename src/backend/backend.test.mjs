import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createBackend } from './service.ts';

const fixture = file => JSON.parse(readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8'));
const persona = fixture('persona-1.json');
const offers = fixture('bank-offers.json');
const input = { debtId: 'demo-debt', offerId: offers[0].id, netSavings: 123, monthlyPayment: 400 };

function memoryStorage() {
  const data = new Map();
  return {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
  };
}

function makeBackend({ storage = memoryStorage(), remote, timeoutMs } = {}) {
  return createBackend({
    remote, storage, storageKey: 'test-backend', timeoutMs,
    getPersona: id => id === persona.id ? persona : undefined,
    bundledOffers: offers,
  });
}

test('an unconfigured backend serves bundled offers and persists local changes across restarts', async () => {
  const storage = memoryStorage();
  const backend = makeBackend({ storage });
  assert.equal(await backend.ensureSignedIn(), null);
  assert.equal(backend.getBackendStatus(), 'unconfigured');
  assert.deepEqual(await backend.listOffers(), offers);
  assert.deepEqual(await backend.loadProfile(), {});
  assert.equal(await backend.loadSnapshot(), null);
  assert.equal(await backend.connectBanks('unknown-persona', []), null);

  const bank = persona.accounts[0].bank;
  await Promise.all([
    backend.saveProfile({ language: 'ro', hadLatePayments: false }),
    backend.saveProfile({ extraAmount: 0 }),
  ]);
  const snapshot = await backend.connectBanks(persona.id, [bank, bank]);
  assert.deepEqual(snapshot.connectedBanks, [bank]);
  assert.deepEqual(snapshot.persona.accounts, persona.accounts.filter(account => account.bank === bank));
  assert.deepEqual(snapshot.persona.debts, persona.debts.filter(debt => debt.lender === bank));
  const accountIds = new Set(snapshot.persona.accounts.map(account => account.id));
  assert.deepEqual(snapshot.persona.transactions, persona.transactions.filter(tx => accountIds.has(tx.accountId)));
  const reference = await backend.submitApplication(input);
  const secondReference = await backend.submitApplication(input);
  assert.match(reference, /^VH-[A-Z0-9]+-[A-Z0-9]+$/);
  assert.notEqual(reference, secondReference);

  const restarted = makeBackend({ storage });
  assert.deepEqual(await restarted.loadProfile(), {
    personaId: persona.id, connectedBanks: [bank], language: 'ro', hadLatePayments: false, extraAmount: 0,
  });
  assert.deepEqual(await restarted.loadSnapshot(), snapshot);
  const applications = await restarted.listApplications();
  assert.deepEqual(applications.map(row => row.reference), [secondReference, reference]);
  assert.equal(applications[0].offerId, input.offerId);
  assert.ok(Number.isFinite(Date.parse(applications[0].createdAt)));
});

test('Firestore failures preserve fallback state even when anonymous sign-in succeeds', async () => {
  async function unavailable() { throw new Error('offline'); }
  const backend = makeBackend({
    remote: {
      ensureSignedIn: async () => 'demo-uid', loadProfile: unavailable,
      saveProfile: unavailable, connectBanks: unavailable, loadSnapshot: unavailable,
      listOffers: unavailable, submitApplication: unavailable, listApplications: unavailable,
    },
  });
  assert.equal(await backend.ensureSignedIn(), 'demo-uid');
  assert.equal(backend.getBackendStatus(), 'online');
  assert.deepEqual(await backend.listOffers(), offers);
  assert.equal(backend.getBackendStatus(), 'offline');
  await backend.saveProfile({ extraAmount: 700 });
  assert.equal((await backend.loadProfile()).extraAmount, 700);
  const snapshot = await backend.connectBanks(persona.id, [persona.accounts[0].bank]);
  assert.deepEqual(await backend.loadSnapshot(), snapshot);
  const reference = await backend.submitApplication(input);
  assert.equal((await backend.listApplications())[0].reference, reference);
});

test('a stalled sign-in falls back without starting a Firestore request after the deadline', async () => {
  let resolveAuth;
  let reads = 0;
  const auth = new Promise(resolve => { resolveAuth = resolve; });
  const backend = makeBackend({
    remote: {
      ensureSignedIn: () => auth,
      listOffers: async () => { reads++; return []; },
    },
    timeoutMs: 10,
  });
  assert.deepEqual(await backend.listOffers(), offers);
  assert.equal(backend.getBackendStatus(), 'offline');
  resolveAuth('demo-uid');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 0);
  assert.deepEqual(await backend.listOffers(), offers);
  assert.equal(reads, 1);
  assert.equal(backend.getBackendStatus(), 'online');
});

test('remote reads and writes recover without discarding local edits or duplicating applications', async () => {
  let online = false;
  let profile = { language: 'en', extraAmount: 100 };
  let snapshot = null;
  const applications = [];
  const remoteOffers = [{ ...offers[0], id: 'remote-offer' }];
  const backend = makeBackend({
    remote: {
      async ensureSignedIn() {
        if (!online) throw new Error('offline');
        return 'demo-uid';
      },
      async loadProfile(uid) { assert.equal(uid, 'demo-uid'); return profile; },
      async saveProfile(uid, patch) {
        assert.equal(uid, 'demo-uid');
        profile = { ...profile, ...patch };
      },
      async connectBanks(uid, data, patch) {
        assert.equal(uid, 'demo-uid');
        snapshot = data;
        profile = { ...profile, ...patch };
      },
      async loadSnapshot() { return snapshot; },
      async listOffers() { return remoteOffers; },
      async submitApplication(uid, app) { assert.equal(uid, 'demo-uid'); applications.push(app); },
      async listApplications() { return applications; },
    },
  });
  await backend.saveProfile({ extraAmount: 800 });
  const offlineRef = await backend.submitApplication(input);
  online = true;
  assert.deepEqual(await backend.loadProfile(), { language: 'en', extraAmount: 800 });
  await backend.saveProfile({ language: 'ro' });
  assert.deepEqual(profile, { language: 'ro', extraAmount: 800 });
  const connected = await backend.connectBanks(persona.id, [persona.accounts[0].bank]);
  assert.deepEqual(snapshot, connected);
  assert.deepEqual(profile.connectedBanks, connected.connectedBanks);
  assert.deepEqual(await backend.loadSnapshot(), connected);
  assert.deepEqual(await backend.listOffers(), remoteOffers);
  const onlineRef = await backend.submitApplication(input);
  assert.equal(applications[0].reference, onlineRef);
  assert.deepEqual((await backend.listApplications()).map(row => row.reference).sort(), [offlineRef, onlineRef].sort());
});
