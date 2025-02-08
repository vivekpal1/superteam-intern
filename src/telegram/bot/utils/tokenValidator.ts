// src/telegram/bot/utils/tokenValidator.ts
import axios from 'axios';
import https from 'https';

export async function validateBotToken(token: string): Promise<boolean> {
    try {
        const agent = new https.Agent({
            keepAlive: true,
            timeout: 30000,
            rejectUnauthorized: true
        });

        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
            timeout: 30000,
            httpsAgent: agent,
            validateStatus: null // Allow any status code
        });

        if (response.status === 401) {
            console.error('Bot token validation failed: Unauthorized. Please check if token is valid and not revoked.');
            return false;
        }

        if (!response.data.ok) {
            console.error('Bot token validation failed:', response.data.description);
            return false;
        }

        console.log('Bot token validated successfully:', response.data.result.username);
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}