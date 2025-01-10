// src/agent/services/walletService.ts
import { config } from '../../config/index.js';

interface WalletBalance {
    token: string;
    amount: string;
}

export class WalletService {
    private apiKey: string;
    private projectId: string;
    private baseUrl: string = 'https://staging.crossmint.com/api/v1-alpha1';

    constructor() {
        this.apiKey = config.CROSSMINT_API_KEY;
        this.projectId = config.CROSSMINT_PROJECT_ID;
    }

    async createWallet() {
        try {
            const response = await fetch(`${this.baseUrl}/wallets`, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chain: 'solana',
                    projectId: this.projectId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create wallet');
            }

            const data = await response.json();
            console.log('Created new wallet:', data.address);
            return data;
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    async getBalance(walletAddress: string): Promise<WalletBalance[]> {
        try {
            const response = await fetch(
                `${this.baseUrl}/wallets/${walletAddress}/balances`,
                {
                    headers: {
                        'x-api-key': this.apiKey,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }

            return response.json();
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }

    async transferTokens(
        fromAddress: string,
        toAddress: string,
        amount: string,
        token: string
    ) {
        try {
            const response = await fetch(`${this.baseUrl}/transfers`, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromAddress,
                    to: toAddress,
                    amount,
                    token,
                    chain: 'solana',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to transfer tokens');
            }

            return response.json();
        } catch (error) {
            console.error('Error transferring tokens:', error);
            throw error;
        }
    }
}