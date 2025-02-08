import { StateManager } from '../types/services.js';

export class StateManagerImpl implements StateManager {
    private states: Map<number, any>;
    private activeUsers: Set<number>;

    constructor() {
        this.states = new Map();
        this.activeUsers = new Set();
    }

    async getUserState(userId: number): Promise<any> {
        return this.states.get(userId);
    }

    async setUserState(userId: number, state: any): Promise<void> {
        this.states.set(userId, state);
        this.activeUsers.add(userId);
    }

    getActiveUserCount(): number {
        return this.activeUsers.size;
    }
}

export function createStateManager(): StateManager {
    return new StateManagerImpl();
} 