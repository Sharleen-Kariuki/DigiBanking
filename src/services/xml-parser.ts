import {
  UploadSession,
  UploadRecord,
  Member,
  Pagination,
  PaginatedResponse,
  ApiError,
  UploadStatus,
  RecordStatus
} from '../types';

export class XmlParser {
  private static parser = new DOMParser();

  public static parseDocument(xmlString: string): Document {
    const doc = this.parser.parseFromString(xmlString, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML Parse Error: ${parseError.textContent || 'Malformed XML document'}`);
    }
    return doc;
  }

  public static checkAndThrowError(doc: Document, httpStatus = 400): void {
    const errorEl = doc.querySelector('response > error');
    if (errorEl) {
      const code = errorEl.querySelector('code')?.textContent?.trim() || 'UNKNOWN_ERROR';
      const message = errorEl.querySelector('message')?.textContent?.trim() || 'An error occurred';
      const detailsNode = errorEl.querySelector('details');
      let details: Record<string, unknown> | undefined;
      if (detailsNode) {
        details = this.nodeToPlainObject(detailsNode) as Record<string, unknown>;
      }
      throw new ApiError(httpStatus, code, message, details);
    }
  }

  public static parseUploadSession(el: Element): UploadSession {
    const getVal = (tag: string) => el.querySelector(`:scope > ${tag}`)?.textContent?.trim() || '';
    const getNum = (tag: string) => Number(getVal(tag)) || 0;

    const chunksEl = el.querySelector(':scope > uploaded_chunks');
    const uploaded_chunks: number[] = [];
    if (chunksEl) {
      chunksEl.querySelectorAll(':scope > item').forEach(item => {
        const n = parseInt(item.textContent || '', 10);
        if (!isNaN(n)) uploaded_chunks.push(n);
      });
    }

    return {
      id: getVal('id'),
      batch_name: getVal('batch_name'),
      description: getVal('description'),
      file_name: getVal('file_name'),
      file_size: getNum('file_size'),
      file_sha256: getVal('file_sha256'),
      chunk_size: getNum('chunk_size') || 1024 * 1024,
      status: (getVal('status') || 'created') as UploadStatus,
      uploaded_chunks,
      chunk_count: getNum('chunk_count'),
      upload_progress: getNum('upload_progress'),
      process_progress: getNum('process_progress'),
      total_rows: getNum('total_rows'),
      processed_rows: getNum('processed_rows'),
      valid_rows: getNum('valid_rows'),
      invalid_rows: getNum('invalid_rows'),
      onboarded_rows: getNum('onboarded_rows'),
      created_at: getVal('created_at'),
      updated_at: getVal('updated_at'),
      completed_at: getVal('completed_at') || undefined
    };
  }

  public static parseUploadRecord(el: Element): UploadRecord {
    const getVal = (tag: string) => el.querySelector(`:scope > ${tag}`)?.textContent?.trim() || '';
    const getNum = (tag: string) => Number(getVal(tag)) || 0;

    return {
      id: getVal('id'),
      upload_id: getVal('upload_id'),
      row_number: getNum('row_number'),
      first_name: getVal('first_name'),
      last_name: getVal('last_name'),
      date_of_birth: getVal('date_of_birth'),
      email: getVal('email'),
      branch: getVal('branch'),
      account_type: getVal('account_type'),
      member_number: getVal('member_number') || undefined,
      phone_number: getVal('phone_number') || undefined,
      id_number: getVal('id_number') || undefined,
      status: (getVal('status') || 'pending') as RecordStatus,
      reason: getVal('reason') || undefined,
      member_id: getVal('member_id') || undefined,
      created_at: getVal('created_at')
    };
  }

  public static parseMember(el: Element): Member {
    const getVal = (tag: string) => el.querySelector(`:scope > ${tag}`)?.textContent?.trim() || '';

    return {
      id: getVal('id'),
      core_member_id: getVal('core_member_id'),
      member_number: getVal('member_number'),
      phone_number: getVal('phone_number'),
      id_number: getVal('id_number'),
      first_name: getVal('first_name'),
      last_name: getVal('last_name'),
      date_of_birth: getVal('date_of_birth'),
      email: getVal('email'),
      branch: getVal('branch'),
      account_type: getVal('account_type'),
      account_number: getVal('account_number'),
      source_upload_id: getVal('source_upload_id'),
      created_at: getVal('created_at')
    };
  }

  public static parsePagination(el: Element | null): Pagination {
    if (!el) {
      return { page: 1, limit: 20, skip: 0, total: 0, total_pages: 1 };
    }
    const getNum = (tag: string) => Number(el.querySelector(`:scope > ${tag}`)?.textContent?.trim()) || 0;
    return {
      page: getNum('page') || 1,
      limit: getNum('limit') || 20,
      skip: getNum('skip') || 0,
      total: getNum('total') || 0,
      total_pages: getNum('total_pages') || 1
    };
  }

  public static parseStatusCounts(el: Element | null): Record<string, number> {
    const result: Record<string, number> = {};
    if (!el) return result;
    el.querySelectorAll(':scope > item').forEach(item => {
      const status = item.querySelector('status')?.textContent?.trim();
      const count = Number(item.querySelector('count')?.textContent?.trim()) || 0;
      if (status) {
        result[status] = count;
      }
    });
    return result;
  }

  public static parseUploadListResponse(xmlString: string, status = 200): PaginatedResponse<UploadSession> {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const items: UploadSession[] = [];
    doc.querySelectorAll('response > data > item').forEach(el => {
      items.push(this.parseUploadSession(el));
    });

    const pagEl = doc.querySelector('response > pagination');
    const pagination = this.parsePagination(pagEl);

    return {
      data: items,
      pagination
    };
  }

  public static parseUploadSingleResponse(xmlString: string, status = 200): { upload: UploadSession; resumed?: boolean; message?: string } {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const uploadEl = doc.querySelector('response > upload');
    if (!uploadEl) {
      throw new Error('Upload session missing in API response');
    }

    const resumedText = doc.querySelector('response > resumed')?.textContent?.trim();
    const resumed = resumedText?.toLowerCase() === 'true';
    const message = doc.querySelector('response > message')?.textContent?.trim() || undefined;

    return {
      upload: this.parseUploadSession(uploadEl),
      resumed,
      message
    };
  }

  public static parseRecordsResponse(xmlString: string, status = 200): PaginatedResponse<UploadRecord> {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const items: UploadRecord[] = [];
    doc.querySelectorAll('response > data > item').forEach(el => {
      items.push(this.parseUploadRecord(el));
    });

    const pagEl = doc.querySelector('response > pagination');
    const pagination = this.parsePagination(pagEl);

    const countsEl = doc.querySelector('response > status_counts');
    const status_counts = this.parseStatusCounts(countsEl);

    return {
      data: items,
      pagination,
      status_counts
    };
  }

  public static parseMembersResponse(xmlString: string, status = 200): PaginatedResponse<Member> {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const items: Member[] = [];
    doc.querySelectorAll('response > data > item').forEach(el => {
      items.push(this.parseMember(el));
    });

    const pagEl = doc.querySelector('response > pagination');
    const pagination = this.parsePagination(pagEl);

    return {
      data: items,
      pagination
    };
  }

  public static parseMemberSingleResponse(xmlString: string, status = 200): Member {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const memberEl = doc.querySelector('response > member');
    if (!memberEl) {
      throw new Error('Member details missing in API response');
    }

    return this.parseMember(memberEl);
  }

  public static parseCommitResponse(xmlString: string, status = 200): {
    upload: UploadSession;
    committed_rows: number;
    conflict_rows: number;
    already_committed?: boolean;
  } {
    const doc = this.parseDocument(xmlString);
    this.checkAndThrowError(doc, status);

    const uploadEl = doc.querySelector('response > upload');
    if (!uploadEl) {
      throw new Error('Upload session missing in commit response');
    }

    const committed_rows = Number(doc.querySelector('response > committed_rows')?.textContent?.trim()) || 0;
    const conflict_rows = Number(doc.querySelector('response > conflict_rows')?.textContent?.trim()) || 0;
    const already_committed = doc.querySelector('response > already_committed')?.textContent?.trim()?.toLowerCase() === 'true';

    return {
      upload: this.parseUploadSession(uploadEl),
      committed_rows,
      conflict_rows,
      already_committed
    };
  }

  public static parseSsePayload(xmlString: string): Record<string, unknown> {
    try {
      const doc = this.parseDocument(xmlString);
      const payloadEl = doc.querySelector('event > payload') || doc.querySelector('payload') || doc.documentElement;
      return this.nodeToPlainObject(payloadEl) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  public static nodeToPlainObject(el: Element): unknown {
    const children = Array.from(el.children);
    if (children.length === 0) {
      const text = el.textContent?.trim() || '';
      if (/^-?\d+(\.\d+)?$/.test(text)) {
        return Number(text);
      }
      if (text.toLowerCase() === 'true') return true;
      if (text.toLowerCase() === 'false') return false;
      return text;
    }

    const isArray = children.every(c => c.tagName.toLowerCase() === 'item');
    if (isArray) {
      return children.map(c => this.nodeToPlainObject(c));
    }

    const obj: Record<string, unknown> = {};
    children.forEach(c => {
      const tag = c.tagName.toLowerCase();
      obj[tag] = this.nodeToPlainObject(c);
    });
    return obj;
  }
}

