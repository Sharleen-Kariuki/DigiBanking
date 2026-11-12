import { apiConfig } from '../config/api-config';
import {
  UploadSession,
  UploadRecord,
  Member,
  PaginatedResponse,
  ODataQueryOptions,
  ApiError
} from '../types';
import { XmlParser } from './xml-parser';
import { XmlBuilder, UploadMetadataRequest } from './xml-builder';

export class ApiClient {
  private static buildUrl(path: string, options?: ODataQueryOptions): string {
    const base = apiConfig.getBaseUrl();
    const url = new URL(`${base}${path.startsWith('/') ? path : '/' + path}`);

    if (options) {
      if (options.page !== undefined) url.searchParams.set('page', String(options.page));
      if (options.limit !== undefined) url.searchParams.set('limit', String(options.limit));
      if (options.status) url.searchParams.set('status', options.status);
      if (options.search) url.searchParams.set('search', options.search);
      if (options.$filter) url.searchParams.set('$filter', options.$filter);
      if (options.$orderby) url.searchParams.set('$orderby', options.$orderby);
      if (options.$top !== undefined) url.searchParams.set('$top', String(options.$top));
      if (options.$skip !== undefined) url.searchParams.set('$skip', String(options.$skip));
      if (options.$count !== undefined) url.searchParams.set('$count', String(options.$count));
      if (options.$select) url.searchParams.set('$select', options.$select);
    }

    return url.toString();
  }

  private static async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (init.signal) {
      init.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiError(
          408,
          'TIMEOUT',
          `Request to API server timed out (${Math.round(timeoutMs / 1000)}s). If the server is waking up on Render, please click Refresh to retry.`
        );
      }
      throw err;
    }
  }

  private static async handleXmlResponse(res: Response): Promise<{ text: string; doc: Document }> {
    const text = await res.text();
    let doc: Document;
    try {
      doc = XmlParser.parseDocument(text);
    } catch {
      throw new ApiError(res.status, 'INVALID_XML', `Server returned invalid XML (HTTP ${res.status})`, { raw: text });
    }

    if (!res.ok) {
      XmlParser.checkAndThrowError(doc, res.status);
      throw new ApiError(res.status, 'HTTP_ERROR', `Request failed with status ${res.status}: ${res.statusText}`);
    }

    return { text, doc };
  }

  public static async listUploads(options?: ODataQueryOptions): Promise<PaginatedResponse<UploadSession>> {
    const url = this.buildUrl('/uploads', options);
    const res = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml' }
    });
    const { text } = await this.handleXmlResponse(res);
    return XmlParser.parseUploadListResponse(text, res.status);
  }

  public static async getUpload(uploadId: string): Promise<UploadSession> {
    const url = this.buildUrl(`/uploads/${uploadId}`);
    const res = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml' }
    });
    const { text } = await this.handleXmlResponse(res);
    const result = XmlParser.parseUploadSingleResponse(text, res.status);
    return result.upload;
  }

  public static async createUpload(
    metadata: UploadMetadataRequest,
    idempotencyKey: string
  ): Promise<{ upload: UploadSession; resumed: boolean }> {
    const url = this.buildUrl('/uploads');
    const xmlBody = XmlBuilder.buildUploadRequest(metadata);

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Idempotency-Key': idempotencyKey,
        Accept: 'application/xml, text/xml'
      },
      body: xmlBody
    });

    const { text } = await this.handleXmlResponse(res);
    const result = XmlParser.parseUploadSingleResponse(text, res.status);
    return {
      upload: result.upload,
      resumed: !!result.resumed
    };
  }

  public static async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    bytes: Uint8Array,
    sha256Hex: string,
    signal?: AbortSignal
  ): Promise<{ upload: UploadSession; alreadyReceived: boolean }> {
    const url = this.buildUrl(`/uploads/${uploadId}/chunks/${chunkIndex}`);
    const res = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-SHA256': sha256Hex,
        Accept: 'application/xml, text/xml'
      },
      body: bytes as unknown as BodyInit,
      signal
    });

    const { text, doc } = await this.handleXmlResponse(res);
    const result = XmlParser.parseUploadSingleResponse(text, res.status);
    const alreadyReceived = doc.querySelector('response > chunk > already_received')?.textContent === 'true';

    return {
      upload: result.upload,
      alreadyReceived
    };
  }

  public static async completeUpload(uploadId: string): Promise<{ upload: UploadSession; message?: string }> {
    const url = this.buildUrl(`/uploads/${uploadId}/complete`);
    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { Accept: 'application/xml, text/xml' }
    });

    const { text } = await this.handleXmlResponse(res);
    const result = XmlParser.parseUploadSingleResponse(text, res.status);
    return {
      upload: result.upload,
      message: result.message
    };
  }

  public static async commitValidatedUpload(
    uploadId: string,
    reviewConfirmed = true
  ): Promise<{
    upload: UploadSession;
    committed_rows: number;
    conflict_rows: number;
    already_committed?: boolean;
  }> {
    const url = this.buildUrl(`/uploads/${uploadId}/commit`);
    const xmlBody = XmlBuilder.buildCommitRequest(reviewConfirmed);

    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        Accept: 'application/xml, text/xml'
      },
      body: xmlBody
    });

    const { text } = await this.handleXmlResponse(res);
    return XmlParser.parseCommitResponse(text, res.status);
  }

  public static async listUploadRecords(
    uploadId: string,
    options?: ODataQueryOptions
  ): Promise<PaginatedResponse<UploadRecord>> {
    const url = this.buildUrl(`/uploads/${uploadId}/records`, options);
    const res = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml' }
    });

    const { text } = await this.handleXmlResponse(res);
    return XmlParser.parseRecordsResponse(text, res.status);
  }

  public static async exportRecords(
    uploadId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
    status?: string,
    filter?: string,
    orderby?: string
  ): Promise<void> {
    const base = apiConfig.getBaseUrl();
    const url = new URL(`${base}/uploads/${uploadId}/records/export`);
    url.searchParams.set('format', format);
    if (status) url.searchParams.set('status', status);
    if (filter) url.searchParams.set('$filter', filter);
    if (orderby) url.searchParams.set('$orderby', orderby);

    const res = await this.fetchWithTimeout(url.toString(), { method: 'GET' });
    if (!res.ok) {
      const err = await res.text();
      try {
        const doc = XmlParser.parseDocument(err);
        XmlParser.checkAndThrowError(doc, res.status);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
      throw new ApiError(res.status, 'EXPORT_FAILED', `Export failed with HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const filename = `records-${uploadId.slice(0, 8)}${status ? '-' + status : ''}.${format}`;
    this.triggerDownload(blob, filename);
  }

  public static async downloadInvalidRows(uploadId: string): Promise<void> {
    const base = apiConfig.getBaseUrl();
    const url = `${base}/uploads/${uploadId}/invalid.xlsx`;
    const res = await this.fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      throw new ApiError(res.status, 'DOWNLOAD_FAILED', `Download of invalid rows failed with HTTP ${res.status}`);
    }
    const blob = await res.blob();
    this.triggerDownload(blob, `invalid-records-${uploadId.slice(0, 8)}.xlsx`);
  }

  public static async downloadTemplate(): Promise<void> {
    const base = apiConfig.getBaseUrl();
    const url = `${base}/onboarding/template`;
    const res = await this.fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      throw new ApiError(res.status, 'TEMPLATE_ERROR', `Failed to download onboarding template (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    this.triggerDownload(blob, 'onboarding-template.xlsx');
  }

  public static async listMembers(options?: ODataQueryOptions): Promise<PaginatedResponse<Member>> {
    const url = this.buildUrl('/members', options);
    const res = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml' }
    });

    const { text } = await this.handleXmlResponse(res);
    return XmlParser.parseMembersResponse(text, res.status);
  }

  public static async getMember(memberId: string): Promise<Member> {
    const url = this.buildUrl(`/members/${memberId}`);
    const res = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml' }
    });

    const { text } = await this.handleXmlResponse(res);
    return XmlParser.parseMemberSingleResponse(text, res.status);
  }

  private static triggerDownload(blob: Blob, defaultFilename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}
