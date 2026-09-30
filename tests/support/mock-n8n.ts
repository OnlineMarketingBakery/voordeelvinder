// A stand-in for n8n and Cloudflare's siteverify, for unit tests (startMockN8n) and the e2e run
// (`tsx tests/support/mock-n8n.ts`, started by playwright.config.ts). Never a real webhook.
//
// - POST /webhook/<name>: records the request and answers with the next queued status (200 when
//   the queue is empty), after the queued delay.
// - POST /turnstile/siteverify: `{ success: true }` unless the token is "fail".
// - GET /_received: the recorded webhook requests; DELETE /_received clears them.
// - POST /_respond: queues responses, body `[{ "status": 500, "delayMs": 0 }, …]`.
// - GET /_health: 200.
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';

export type ReceivedRequest = {
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
};

export type MockResponse = { status: number; delayMs?: number };

export type MockN8n = {
  /** http://127.0.0.1:<port> */
  url: string;
  received: ReceivedRequest[];
  /** Queues responses for the next webhook requests. */
  respond(...responses: MockResponse[]): void;
  close(): Promise<void>;
};

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function parse(text: string, type: string | undefined): unknown {
  if (type?.startsWith('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function startMockN8n(port = 0, host = '127.0.0.1'): Promise<MockN8n> {
  const received: ReceivedRequest[] = [];
  const queue: MockResponse[] = [];

  const server: Server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://mock').pathname;
    const body = parse(await readBody(request), request.headers['content-type']);
    const send = (status: number, value: unknown = { ok: status < 400 }) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(value));
    };

    if (request.method === 'GET' && path === '/_health') return send(200);
    if (path === '/_received') {
      if (request.method === 'DELETE') received.length = 0;
      return send(200, received);
    }
    if (request.method === 'POST' && path === '/_respond') {
      queue.push(...(Array.isArray(body) ? (body as MockResponse[]) : []));
      return send(200);
    }
    if (request.method === 'POST' && path === '/turnstile/siteverify') {
      const token = (body as Record<string, unknown>).response;
      return send(200, { success: token !== 'fail' });
    }
    if (request.method === 'POST' && path.startsWith('/webhook/')) {
      received.push({ path, headers: request.headers, body });
      const next = queue.shift() ?? { status: 200 };
      if (next.delayMs) await new Promise((resolve) => setTimeout(resolve, next.delayMs));
      if (response.destroyed) return;
      return send(next.status);
    }
    send(404);
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const { port: actual } = server.address() as AddressInfo;
  return {
    url: `http://${host}:${actual}`,
    received,
    respond: (...responses) => queue.push(...responses),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

// Run directly (the e2e webServer): `tsx tests/support/mock-n8n.ts [port]`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? process.env.MOCK_N8N_PORT ?? 4390);
  const mock = await startMockN8n(port);
  console.log(`mock n8n listening on ${mock.url}`);
}
