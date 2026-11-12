import { ApiClient } from './api-client';
import { UploadSession } from '../types';

export const CHUNK_SIZE = 1024 * 1024; // 1MB chunks to match backend

export interface UploadProgressInfo {
  uploadId?: string;
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  uploadedChunkIndices: number[];
  speedBps?: number;
  isResumed?: boolean;
}

export type UploaderStatus =
  | 'idle'
  | 'hashing'
  | 'initiating'
  | 'uploading'
  | 'paused'
  | 'interrupted'
  | 'completing'
  | 'completed'
  | 'error';

export interface ChunkedUploaderOptions {
  batchName: string;
  description?: string;
  file: File;
  idempotencyKey?: string;
  onStatusChange?: (status: UploaderStatus, message?: string) => void;
  onProgress?: (progress: UploadProgressInfo) => void;
  onComplete?: (session: UploadSession) => void;
  onError?: (error: Error) => void;
}

export class ChunkedUploader {
  private options: ChunkedUploaderOptions;
  private status: UploaderStatus = 'idle';
  private abortController: AbortController | null = null;
  private fileSha256 = '';
  private uploadSession: UploadSession | null = null;
  private uploadedChunkIndices: Set<number> = new Set();
  private totalChunks = 0;
  private idempotencyKey = '';

  constructor(options: ChunkedUploaderOptions) {
    this.options = options;
    this.totalChunks = Math.max(1, Math.ceil(this.options.file.size / CHUNK_SIZE));
  }

  public async start(): Promise<UploadSession> {
    try {
      this.setStatus('hashing', 'Computing file SHA-256 checksum...');
      this.fileSha256 = await this.computeSha256(this.options.file);

      // Generate or use idempotency key (min 8 chars, max 128 chars)
      if (this.options.idempotencyKey) {
        this.idempotencyKey = this.options.idempotencyKey;
      } else {
        const baseKey = `${this.options.batchName}_${this.options.file.name}_${this.options.file.size}_${this.fileSha256.slice(0, 16)}`;
        this.idempotencyKey = baseKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
      }

      this.setStatus('initiating', 'Registering upload session with server...');
      this.abortController = new AbortController();

      const { upload, resumed } = await ApiClient.createUpload(
        {
          batch_name: this.options.batchName,
          description: this.options.description,
          file_name: this.options.file.name,
          file_size: this.options.file.size,
          file_sha256: this.fileSha256
        },
        this.idempotencyKey
      );

      this.uploadSession = upload;
      this.uploadedChunkIndices = new Set(upload.uploaded_chunks || []);

      return await this.uploadChunks(resumed);
    } catch (err) {
      if (this.status === 'interrupted' || this.status === 'paused') {
        throw err;
      }
      this.setStatus('error', err instanceof Error ? err.message : 'Upload failed');
      if (this.options.onError) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  public async resume(): Promise<UploadSession> {
    if (!this.uploadSession) {
      return this.start();
    }

    try {
      this.setStatus('initiating', 'Checking session status on server...');
      const latest = await ApiClient.getUpload(this.uploadSession.id);
      this.uploadSession = latest;
      this.uploadedChunkIndices = new Set(latest.uploaded_chunks || []);

      return await this.uploadChunks(true);
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err.message : 'Failed to resume upload');
      if (this.options.onError) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  public simulateNetworkInterruption(): void {
    if (this.status !== 'uploading') return;
    this.setStatus('interrupted', 'Network connection interrupted. Upload paused. You can resume anytime.');
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public pause(): void {
    if (this.status !== 'uploading') return;
    this.setStatus('paused', 'Upload paused by user.');
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async uploadChunks(isResumed: boolean): Promise<UploadSession> {
    if (!this.uploadSession) throw new Error('No active upload session');

    this.setStatus('uploading', isResumed ? 'Resuming upload...' : 'Uploading chunks...');
    this.abortController = new AbortController();

    const uploadId = this.uploadSession.id;
    const file = this.options.file;
    const totalBytes = file.size;

    for (let chunkIdx = 0; chunkIdx < this.totalChunks; chunkIdx++) {
      if (this.uploadedChunkIndices.has(chunkIdx)) {
        this.emitProgress(uploadId, chunkIdx + 1, totalBytes, isResumed);
        continue;
      }

      if (this.status === 'interrupted' || this.status === 'paused') {
        throw new Error(this.status === 'interrupted' ? 'Upload interrupted by network simulation' : 'Upload paused');
      }

      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBlob = file.slice(start, end);
      const chunkBuffer = await chunkBlob.arrayBuffer();
      const chunkBytes = new Uint8Array(chunkBuffer);
      const chunkSha256 = await this.bufferToSha256(chunkBuffer);

      try {
        const { upload } = await ApiClient.uploadChunk(
          uploadId,
          chunkIdx,
          chunkBytes,
          chunkSha256,
          this.abortController.signal
        );

        this.uploadSession = upload;
        this.uploadedChunkIndices.add(chunkIdx);
        this.emitProgress(uploadId, chunkIdx + 1, totalBytes, isResumed);
      } catch (err) {
        if (this.abortController?.signal.aborted) {
          const isInterrupted = (this.status as UploaderStatus) === 'interrupted';
          throw new Error(isInterrupted ? 'Network connection lost' : 'Upload paused');
        }
        throw err;
      }
    }

    // Complete upload and trigger server validation
    this.setStatus('completing', 'Finalizing file and triggering validation...');
    const completeResult = await ApiClient.completeUpload(uploadId);
    this.uploadSession = completeResult.upload;

    this.setStatus('completed', 'File verified. Row validation is in progress.');
    if (this.options.onComplete) {
      this.options.onComplete(this.uploadSession);
    }

    return this.uploadSession;
  }

  private emitProgress(uploadId: string, chunksDone: number, totalBytes: number, isResumed: boolean): void {
    if (!this.options.onProgress) return;
    const uploadedBytes = Math.min(totalBytes, chunksDone * CHUNK_SIZE);
    const percent = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));

    this.options.onProgress({
      uploadId,
      bytesUploaded: uploadedBytes,
      totalBytes,
      percent,
      currentChunk: chunksDone,
      totalChunks: this.totalChunks,
      uploadedChunkIndices: Array.from(this.uploadedChunkIndices),
      isResumed
    });
  }

  private async computeSha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return this.bufferToSha256(buffer);
  }

  private async bufferToSha256(buffer: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private setStatus(status: UploaderStatus, message?: string): void {
    this.status = status;
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status, message);
    }
  }

  public getStatus(): UploaderStatus {
    return this.status;
  }

  public getUploadSession(): UploadSession | null {
    return this.uploadSession;
  }

  public getIdempotencyKey(): string {
    return this.idempotencyKey;
  }
}
