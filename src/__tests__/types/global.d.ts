// src/__tests__/types/global.d.ts
/// <reference lib="dom" />

interface Response extends GlobalResponse {
    buffer(): Promise<Buffer>;
}

declare global {
    const fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    
    namespace NodeJS {
        interface Global {
            fetch: typeof fetch;
        }
    }
}

export {};