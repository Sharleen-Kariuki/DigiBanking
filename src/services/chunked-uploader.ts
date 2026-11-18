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
  existingSession?: UploadSession;
  simulateInterruption?: boolean;
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
    if (options.existingSession) {
      this.uploadSession = options.existingSession;
      this.uploadedChunkIndices = new Set(options.existingSession.uploaded_chunks || []);
    }
  }

  public async start(): Promise<UploadSession> {
    try {
      if (this.uploadSession) {
        return await this.resume();
      }

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
        return this.uploadSession as UploadSession;
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
      if (this.status === 'interrupted' || this.status === 'paused') {
        return this.uploadSession as UploadSession;
      }
      this.setStatus('error', err instanceof Error ? err.message : 'Failed to resume upload');
      if (this.options.onError) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  public simulateNetworkInterruption(): void {
    if (this.status === 'completed' || this.status === 'error') return;
    this.setStatus('interrupted', 'Network connection interrupted. Upload paused. You can resume anytime.');
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  public pause(): void {
    if (this.status === 'completed' || this.status === 'error') return;
    this.setStatus('paused', 'Upload paused by user.');
    if (this.abortController) {
      this.abortController.abort();
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

      const currentStatus = this.status as UploaderStatus;
      if (currentStatus === 'interrupted' || currentStatus === 'paused') {
        throw new Error(currentStatus === 'interrupted' ? 'Upload interrupted by network simulation' : 'Upload paused');
      }

      if (this.options.simulateInterruption) {
        await new Promise(r => setTimeout(r, 600));
        const afterWaitStatus = this.status as UploaderStatus;
        if (afterWaitStatus === 'interrupted' || afterWaitStatus === 'paused') {
          throw new Error('Upload interrupted by network simulation');
        }
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

        if (this.options.simulateInterruption && !isResumed) {
          this.options.simulateInterruption = false;
          this.simulateNetworkInterruption();
          throw new Error('Upload interrupted by network simulation');
        }
      } catch (err) {
        const catchStatus = this.status as UploaderStatus;
        if (catchStatus === 'interrupted' || catchStatus === 'paused' || this.abortController?.signal.aborted) {
          const isInterrupted = catchStatus === 'interrupted';
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
    // crypto.subtle requires a secure context (HTTPS). On plain HTTP (e.g. nginx
    // without TLS) it is undefined — fall back to a pure-JS SHA-256 implementation.
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return pureJsSha256(buffer);
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

// ---------------------------------------------------------------------------
// Pure-JS SHA-256 — used when crypto.subtle is unavailable (HTTP / no TLS)
// Based on the FIPS 180-4 reference algorithm; no external dependencies.
// ---------------------------------------------------------------------------
function pureJsSha256(buffer: ArrayBuffer): string {
  // Initial hash values (first 32 bits of fractional parts of sqrt of primes 2-19)
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // Round constants (first 32 bits of fractional parts of cbrt of primes 2-311)
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const data = new Uint8Array(buffer);
  const bitLen = data.length * 8;

  // Pre-processing: padding
  const padLen = data.length % 64 < 56 ? 56 - (data.length % 64) : 120 - (data.length % 64);
  const padded = new Uint8Array(data.length + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  // Append bit length as 64-bit big-endian (we only handle files < 2^32 bits)
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  const rotr32 = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const add32 = (...args: number[]) => args.reduce((a, b) => (a + b) | 0);

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < padded.length; offset += 64) {
    const W: number[] = new Array(64);
    for (let t = 0; t < 16; t++) {
      W[t] = dv.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr32(W[t - 15], 7) ^ rotr32(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr32(W[t - 2], 17) ^ rotr32(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = add32(W[t - 16], s0, W[t - 7], s1);
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = add32(h, S1, ch, K[t], W[t]);
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add32(S0, maj);

      h = g; g = f; f = e; e = add32(d, temp1);
      d = c; c = b; b = a; a = add32(temp1, temp2);
    }

    H[0] = add32(H[0], a); H[1] = add32(H[1], b);
    H[2] = add32(H[2], c); H[3] = add32(H[3], d);
    H[4] = add32(H[4], e); H[5] = add32(H[5], f);
    H[6] = add32(H[6], g); H[7] = add32(H[7], h);
  }

  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
