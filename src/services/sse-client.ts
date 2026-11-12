import { apiConfig } from '../config/api-config';
import { XmlParser } from './xml-parser';

export type SseConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'completed' | 'error';

export interface SseEventMessage {
  id: number;
  event: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export class SseClient {
  private uploadId: string;
  private eventSource: EventSource | null = null;
  private lastEventId = 0;
  private connectionState: SseConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed = false;

  private messageListeners: Array<(msg: SseEventMessage) => void> = [];
  private stateListeners: Array<(state: SseConnectionState) => void> = [];

  constructor(uploadId: string, initialLastEventId = 0) {
    this.uploadId = uploadId;
    this.lastEventId = initialLastEventId;
  }

  public connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setConnectionState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const base = apiConfig.getBaseUrl();
    const url = new URL(`${base}/uploads/${this.uploadId}/events`);
    if (this.lastEventId > 0) {
      url.searchParams.set('last_event_id', String(this.lastEventId));
    }

    try {
      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
      };

      const eventNames = [
        'upload_created',
        'chunk_received',
        'file_received',
        'processing_started',
        'row_processed',
        'validation_completed',
        'commit_started',
        'row_committed',
        'commit_completed',
        'failed'
      ];

      eventNames.forEach(name => {
        this.eventSource?.addEventListener(name, (evt: MessageEvent) => {
          this.handleEvent(evt, name);
        });
      });

      this.eventSource.onmessage = (evt: MessageEvent) => {
        this.handleEvent(evt, 'message');
      };

      this.eventSource.onerror = () => {
        if (this.isExplicitlyClosed) return;
        this.handleDisconnect();
      };
    } catch {
      this.handleDisconnect();
    }
  }

  private handleEvent(evt: MessageEvent, fallbackEvent: string): void {
    const rawId = evt.lastEventId ? Number(evt.lastEventId) : 0;
    if (rawId > this.lastEventId) {
      this.lastEventId = rawId;
    }

    const eventName = evt.type || fallbackEvent;
    const payload = XmlParser.parseSsePayload(evt.data);

    const message: SseEventMessage = {
      id: this.lastEventId,
      event: eventName,
      payload,
      timestamp: new Date()
    };

    this.notifyMessage(message);

    if (eventName === 'commit_completed' || eventName === 'failed') {
      this.setConnectionState('completed');
    }
  }

  private handleDisconnect(): void {
    if (this.isExplicitlyClosed) return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setConnectionState('error');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 10000);
    this.reconnectTimer = window.setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, backoffMs);
  }

  public close(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionState('disconnected');
  }

  public onMessage(listener: (msg: SseEventMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  public onStateChange(listener: (state: SseConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  public getState(): SseConnectionState {
    return this.connectionState;
  }

  public getLastEventId(): number {
    return this.lastEventId;
  }

  private setConnectionState(state: SseConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateListeners.forEach(l => l(state));
    }
  }

  private notifyMessage(msg: SseEventMessage): void {
    this.messageListeners.forEach(l => {
      try {
        l(msg);
      } catch (err) {
        console.error('Error in SSE listener:', err);
      }
    });
  }
}

