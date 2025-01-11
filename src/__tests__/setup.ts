// src/__tests__/setup.ts
import { jest } from '@jest/globals';

class MockResponse implements Response {
    readonly headers: Headers;
    readonly ok: boolean;
    readonly redirected: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly type: ResponseType;
    readonly url: string;
    readonly body: ReadableStream<Uint8Array> | null;
    readonly bodyUsed: boolean;

    constructor() {
        this.headers = new Headers();
        this.ok = true;
        this.redirected = false;
        this.status = 200;
        this.statusText = 'OK';
        this.type = 'default';
        this.url = 'https://test.com';
        this.body = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('test content'));
                controller.close();
            }
        });
        this.bodyUsed = false;
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return new TextEncoder().encode('test content').buffer;
    }

    async blob(): Promise<Blob> {
        return new Blob(['test content'], { type: 'text/plain' });
    }

    async formData(): Promise<FormData> {
        return new FormData();
    }

    async json(): Promise<any> {
        return { content: 'test content' };
    }

    async text(): Promise<string> {
        return 'test content';
    }

    async bytes(): Promise<Uint8Array> {
        return new TextEncoder().encode('test content');
    }

    clone(): Response {
        return new MockResponse();
    }

    async buffer(): Promise<Buffer> {
        return Buffer.from('test content');
    }
}

const mockFetch = jest.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => 
        Promise.resolve(new MockResponse())
);

global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
    jest.clearAllMocks();
});

// Export for use in tests
export { MockResponse, mockFetch };