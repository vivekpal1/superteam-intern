// src/telegram/bot/handlers/messageHandler.ts
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { Services } from '../types/services.js';

export class MessageHandler {
    private services: Services;
    private botUsername: string;
    private defaultContext: string;

    constructor(services: Services, botUsername: string) {
        this.services = services;
        this.botUsername = botUsername;
        this.defaultContext = `I am an AI assistant for Superteam Vietnam, a Web3 builder community. 
I help with:
- Answering questions about Superteam VN and Web3
- Providing information about our events and initiatives
- Helping members connect and collaborate
- Supporting community growth and engagement`;
    }

    async handleMessage(ctx: Context) {
        try {
            // Log the entire context for debugging
            console.log('[MessageHandler] Full context:', {
                message: ctx.message,
                chat: ctx.chat,
                from: ctx.from,
                updateType: ctx.updateType
            });

            if (!ctx.message || !('text' in ctx.message)) {
                console.log('[MessageHandler] Not a text message');
                return;
            }

            const messageText = ctx.message.text;
            const messageId = ctx.message.message_id;

            // Check different ways to trigger the bot
            const isMention = ctx.message.entities?.some(
                entity => 
                    entity.type === 'mention' && 
                    messageText.slice(entity.offset, entity.offset + entity.length) === `@${this.botUsername}`
            );
            const isReply = ctx.message.reply_to_message?.from?.username === this.botUsername;
            const isDirectMessage = ctx.chat?.type === 'private';

            // More detailed logging
            console.log('[MessageHandler] Detailed message analysis:', {
                messageText,
                botUsername: this.botUsername,
                isMention,
                isReply,
                isDirectMessage,
                chatType: ctx.chat?.type,
                messageFrom: ctx.message.from,
                entities: ctx.message.entities
            });

            if (isMention || isReply || isDirectMessage) {
                console.log('[MessageHandler] Bot was triggered by:', {
                    isMention,
                    isReply,
                    isDirectMessage
                });
                
                await ctx.sendChatAction('typing');

                let query = messageText;
                if (isMention) {
                    // Remove the bot mention more accurately using entities
                    const mentionEntity = ctx.message.entities?.find(
                        entity => 
                            entity.type === 'mention' && 
                            messageText.slice(entity.offset, entity.offset + entity.length) === `@${this.botUsername}`
                    );
                    if (mentionEntity) {
                        query = messageText.slice(0, mentionEntity.offset) + 
                               messageText.slice(mentionEntity.offset + mentionEntity.length);
                        query = query.trim();
                    }
                    console.log('[MessageHandler] Extracted query from mention:', {
                        original: messageText,
                        cleaned: query
                    });
                }

                console.log('[MessageHandler] Processing query:', query);

                const prompt = `${this.defaultContext}

Current query: "${query}"

Instructions:
1. Respond in a friendly, conversational manner
2. If the query is about Superteam VN, use your knowledge to provide accurate information
3. If unsure, acknowledge uncertainty and suggest where to find more information
4. Keep responses concise but informative
5. Use appropriate emojis to make responses engaging
6. If asked about events or initiatives, mention they can use /events command for latest updates
7. For member searches, remind them about the /find command

Your response:`;

                let response = await this.services.modelSelector.generateResponse(prompt);
                response = this.formatResponse(response);

                console.log('[MessageHandler] Generated response:', response);

                try {
                    await ctx.telegram.sendMessage(ctx.message.chat.id, response, {
                        parse_mode: 'Markdown',
                        reply_to_message_id: messageId
                    } as any);
                    console.log('[MessageHandler] Response sent successfully');
                } catch (error) {
                    console.error('[MessageHandler] Error sending response:', error);
                    // Try sending without markdown if there's a formatting error
                    await ctx.telegram.sendMessage(ctx.message.chat.id, response.replace(/[*_`]/g, ''), {
                        reply_to_message_id: messageId
                    } as any);
                }
            } else {
                console.log('[MessageHandler] Message ignored - not for bot');
            }
        } catch (error) {
            console.error('[MessageHandler] Error handling message:', error);
            try {
                if (ctx.message) {
                    await ctx.telegram.sendMessage(
                        ctx.message.chat.id,
                        'Sorry, I had trouble processing that message. Could you try rephrasing it?',
                        {
                            reply_to_message_id: ctx.message.message_id
                        } as any
                    );
                }
            } catch (replyError) {
                console.error('[MessageHandler] Error sending error message:', replyError);
            }
        }
    }

    private formatResponse(text: string): string {
        return text
            .replace(/^Sure!|^Okay!|^Well,/g, '🤖')
            .replace(/Superteam/g, '🚀 Superteam')
            .replace(/Web3/g, '🌐 Web3')
            .replace(/community/g, '👥 community')
            .replace(/event/g, '📅 event')
            .replace(/builder/g, '👨‍💻 builder')
            .trim();
    }
}