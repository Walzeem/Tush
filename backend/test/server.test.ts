import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Keypair } from '@stellar/stellar-base';
import { loadConfig } from '../src/config.ts';
import { openDatabase, type TagDatabase } from '../src/db.ts';
import { createApp } from '../src/app.ts';

const SEP53_PREFIX = 'Stellar Signed Message:\n';

function signSep53(keypair: Keypair, message: string): string {
  const digest = createHash('sha256')
    .update(Buffer.concat([Buffer.from(SEP53_PREFIX), Buffer.from(message, 'utf8')]))
    .digest();
  return keypair.sign(digest).toString('base64');
}

function signRaw(keypair: Keypair, message: string): string {
  return keypair.sign(Buffer.from(message, 'utf8')).toString('base64');
}

describe('Tush SEP-2 Federation & Tag Server (TypeScript)', () => {
  let server: Server;
  let db: TagDatabase;
  let baseUrl: string;

  before(async () => {
    const config = loadConfig({
      PORT: '0',
      DB_PATH: ':memory:',
      FEDERATION_DOMAIN: 'tush.local',
      PUBLIC_URL: 'https://tags.tush.local',
      MAX_TAGS_PER_ADDRESS: '2',
      RATE_LIMIT_READ_MAX: '500',
      RATE_LIMIT_REGISTER_MAX: '500',
    });
    db = openDatabase(':memory:');
    const app = createApp({ config, db });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  });

  it('serves health and SEP-1 stellar.toml with proper federation URL', async () => {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as { status: string; database: string };
    assert.equal(health.status, 'UP');
    assert.equal(health.database, 'up');

    const tomlRes = await fetch(`${baseUrl}/.well-known/stellar.toml`);
    assert.equal(tomlRes.status, 200);
    assert.equal(tomlRes.headers.get('access-control-allow-origin'), '*');
    const toml = await tomlRes.text();
    assert.match(toml, /FEDERATION_SERVER="https:\/\/tags\.tush\.local\/federation"/);
  });

  it('rejects unsigned or forged registrations (401)', async () => {
    const victim = Keypair.random();
    const attacker = Keypair.random();

    const noSig = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'victimtag', address: victim.publicKey() }),
    });
    assert.equal(noSig.status, 401);

    const msg = `register:victimtag:${victim.publicKey()}`;
    const badSig = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'victimtag',
        address: victim.publicKey(),
        signature: signSep53(attacker, msg),
      }),
    });
    assert.equal(badSig.status, 401);
  });

  it('validates username rules and reserved names (422)', async () => {
    const kp = Keypair.random();
    for (const bad of ['ab', 'bad_name', 'a'.repeat(21), 'admin', 'stellar']) {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: bad,
          address: kp.publicKey(),
          signature: signSep53(kp, `register:${bad}:${kp.publicKey()}`),
        }),
      });
      assert.equal(res.status, 422, `Expected 422 for "${bad}", got ${res.status}`);
    }
  });

  it('registers with SEP-53 signature, resolves SEP-2 name/id and /lookup', async () => {
    const alice = Keypair.random();
    const address = alice.publicKey();
    const message = `register:alice:${address}`;

    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Alice',
        address,
        signature: signSep53(alice, message),
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = (await regRes.json()) as { username: string; is_primary: boolean };
    assert.equal(regData.username, 'alice*tush.local');
    assert.equal(regData.is_primary, true);

    const retryRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        address,
        signature: signSep53(alice, message),
      }),
    });
    assert.equal(retryRes.status, 200);

    const bob = Keypair.random();
    const conflictRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        address: bob.publicKey(),
        signature: signSep53(bob, `register:alice:${bob.publicKey()}`),
      }),
    });
    assert.equal(conflictRes.status, 409);

    const fedName = await fetch(`${baseUrl}/federation?q=alice*tush.local&type=name`);
    assert.equal(fedName.status, 200);
    assert.deepEqual(await fedName.json(), {
      stellar_address: 'alice*tush.local',
      account_id: address,
    });

    const fedId = await fetch(`${baseUrl}/federation?q=${address}&type=id`);
    assert.equal(fedId.status, 200);
    assert.deepEqual(await fedId.json(), {
      stellar_address: 'alice*tush.local',
      account_id: address,
    });

    const lookupRes = await fetch(`${baseUrl}/lookup?address=${address}`);
    assert.equal(lookupRes.status, 200);
    assert.deepEqual(await lookupRes.json(), {
      username: 'alice*tush.local',
      address,
    });
  });

  it('supports raw ed25519 signatures, memos, and per-address tag limits', async () => {
    const user = Keypair.random();
    const addr = user.publicKey();

    const msg1 = `register:memo1:${addr}:text:inv-42`;
    const r1 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'memo1',
        address: addr,
        memo_type: 'text',
        memo: 'inv-42',
        signature: signRaw(user, msg1),
      }),
    });
    assert.equal(r1.status, 201);

    const fed = (await (await fetch(`${baseUrl}/federation?q=memo1*tush.local&type=name`)).json()) as {
      memo_type: string;
      memo: string;
    };
    assert.equal(fed.memo_type, 'text');
    assert.equal(fed.memo, 'inv-42');

    const msg2 = `register:memo2:${addr}`;
    const r2 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'memo2',
        address: addr,
        signature: signSep53(user, msg2),
      }),
    });
    assert.equal(r2.status, 201);
    assert.equal(((await r2.json()) as { is_primary: boolean }).is_primary, false);

    const msg3 = `register:memo3:${addr}`;
    const r3 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'memo3',
        address: addr,
        signature: signSep53(user, msg3),
      }),
    });
    assert.equal(r3.status, 409);
  });
});

