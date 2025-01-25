export interface UserState {
    currentState: 'idle' | 'awaiting_upload' | 'awaiting_confirmation';
    data?: any;
} 