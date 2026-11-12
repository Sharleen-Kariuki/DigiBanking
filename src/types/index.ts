export type UploadStatus =
  | 'created'
  | 'uploading'
  | 'uploaded'
  | 'validating'
  | 'validated'
  | 'validated_with_errors'
  | 'committing'
  | 'committed'
  | 'committed_with_errors'
  | 'failed';

export type RecordStatus =
  | 'pending'
  | 'checking'
  | 'valid'
  | 'onboarded'
  | 'invalid'
  | 'duplicate';

export interface UploadSession {
  id: string;
  batch_name: string;
  description: string;
  file_name: string;
  file_size: number;
  file_sha256: string;
  chunk_size: number;
  status: UploadStatus;
  uploaded_chunks: number[];
  chunk_count: number;
  upload_progress: number;
  process_progress: number;
  total_rows: number;
  processed_rows: number;
  valid_rows: number;
  invalid_rows: number;
  onboarded_rows: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface UploadRecord {
  id: string;
  upload_id: string;
  row_number: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  branch: string;
  account_type: string;
  member_number?: string;
  phone_number?: string;
  id_number?: string;
  status: RecordStatus;
  reason?: string;
  member_id?: string;
  created_at: string;
}

export interface Member {
  id: string;
  core_member_id: string;
  member_number: string;
  phone_number: string;
  id_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  branch: string;
  account_type: string;
  account_number: string;
  source_upload_id: string;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  status_counts?: Record<string, number>;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ODataQueryOptions {
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
  $select?: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface SSEValidationEvent {
  id: number;
  event: string;
  payload: Record<string, unknown>;
}

