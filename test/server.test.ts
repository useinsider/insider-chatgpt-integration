import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

let child: ChildProcess;
let baseUrl: string;

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const probe = createNetServer();
		probe.once('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const address = probe.address();
			if (address === null || typeof address === 'string') {
				probe.close();
				reject(new Error('no port assigned'));
				return;
			}
			probe.close(() => resolve(address.port));
		});
	});
}

async function waitForHealth(url: string): Promise<void> {
	const deadline = Date.now() + 20000;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`server exited with code ${child.exitCode}`);
		}
		try {
			const res = await fetch(`${url}/health`);
			if (res.ok) {
				return;
			}
		} catch {
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error('server did not become healthy');
}

let nextId = 1;

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<{ status: number; body: any }> {
	const res = await fetch(`${baseUrl}/mcp`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
	});
	return { status: res.status, body: await res.json() };
}

function initialize(): Promise<{ status: number; body: any }> {
	return rpc('initialize', {
		protocolVersion: '2025-03-26',
		capabilities: {},
		clientInfo: { name: 'server-test', version: '1.0.0' },
	});
}

before(async () => {
	const port = await freePort();
	baseUrl = `http://127.0.0.1:${port}`;
	child = spawn(process.execPath, [join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(projectRoot, 'src', 'server.ts')], {
		cwd: projectRoot,
		env: { ...process.env, PORT: String(port) },
		stdio: 'ignore',
	});
	await waitForHealth(baseUrl);
});

after(() => {
	child.kill();
});

test('POST /mcp answers initialize and then tools/list in consecutive requests', async () => {
	const first = await initialize();
	assert.equal(first.status, 200);
	assert.equal(first.body.error, undefined);
	assert.equal(first.body.result.serverInfo.name, 'Your MCP Server');

	const second = await rpc('tools/list');
	assert.equal(second.status, 200);
	assert.equal(second.body.error, undefined);
	assert.ok(Array.isArray(second.body.result.tools));
});

test('sequential requests to the same process all succeed and the process stays up', async () => {
	for (let i = 0; i < 4; i++) {
		const response = i % 2 === 0 ? await initialize() : await rpc('tools/list');
		assert.equal(response.status, 200);
		assert.equal(response.body.error, undefined);
		assert.ok(response.body.result);
	}
	assert.equal(child.exitCode, null);
	const health = await fetch(`${baseUrl}/health`);
	assert.equal(health.status, 200);
});

test('a fresh request lists every registered tool', async () => {
	const response = await rpc('tools/list');
	assert.equal(response.status, 200);
	const names = response.body.result.tools.map((tool: { name: string }) => tool.name);
	assert.ok(names.includes('get-deals-and-discounts'));
	assert.ok(names.includes('get-product-recommendations'));
	assert.ok(names.includes('setup-product-notifications'));
});

test('a fresh request lists every registered widget resource', async () => {
	const response = await rpc('resources/list');
	assert.equal(response.status, 200);
	const uris = response.body.result.resources.map((resource: { uri: string }) => resource.uri);
	assert.ok(uris.includes('ui://widget/deals.html'));
	assert.ok(uris.includes('ui://widget/trend-products.html'));
	assert.ok(uris.includes('ui://widget/notifications.html'));
});
