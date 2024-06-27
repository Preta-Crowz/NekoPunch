export interface iTool {
    refresh(type: Supported): void
    refreshAll(): void
}

export type Supported = "chzzk" | 'youtube' | 'kick';