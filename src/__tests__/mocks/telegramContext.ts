// src/__tests__/mocks/telegramContext.ts
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';

export class MockContext implements Partial<Context> {
    public replies: string[] = [];
    public message: any = null;
    public from?: { id: string };
    public telegram: any;

    constructor() {
        this.telegram = {
            getFile: jest.fn().mockResolvedValue({
                file_id: 'test-file-id',
                file_path: 'test/path'
            }),
            sendMessage: jest.fn().mockResolvedValue(true)
        };
    }

    async reply(text: string, extra?: any) {
        this.replies.push(text);
        return {} as Message.TextMessage;
    }

    withUser(userId: string): this {
        this.from = { id: userId };
        return this;
    }
}

export const createMockDocument = (fileName: string, fileSize: number) => ({
    document: {
        file_id: 'test-file-id',
        file_name: fileName,
        file_size: fileSize,
        mime_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain'
    },
    from: {
        id: '12345'
    }
});
