import { ApiClient } from '../services/api-client';
import { UploadSession, PaginatedResponse } from '../types';
import { NewBatchModal } from './new-batch-modal';

export class BatchesView {
  private container: HTMLElement;
  private dt: any = null;
  private activeStatus = '';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'batches-view';
  }

  public async render(): Promise<HTMLElement> {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900);">Upload Batches</h2>
          <p style="color: var(--neutral-500); font-size: 0.9rem; margin-top: 0.2rem;">
            Manage bulk spreadsheet uploads, follow validation progress, and review records before committing.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button type="button" class="btn btn-primary" id="btn-create-batch-view">
            + New Upload Batch
          </button>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Batches</span>
            <i class="fa-solid fa-folder" style="color: var(--neutral-400);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" id="stat-total-batches">-</div>
          <div class="stat-subtext">Uploaded sessions</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Pending Staff Review</span>
            <i class="fa-solid fa-clipboard-list" style="color: var(--warning);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--warning);" id="stat-pending-review">-</div>
          <div class="stat-subtext">Validated & ready to commit</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Successfully Committed</span>
            <i class="fa-solid fa-circle-check" style="color: var(--success);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--success);" id="stat-committed-batches">-</div>
          <div class="stat-subtext">Onboarded to digital banking</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Members Onboarded</span>
            <i class="fa-solid fa-users" style="color: var(--secondary);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--secondary);" id="stat-total-onboarded">-</div>
          <div class="stat-subtext">Across all batches</div>
        </div>
      </div>

      <!-- Main Batches Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">All Batches</h3>
            <p class="card-subtitle">Search, filter by status, sort by date, and open batches</p>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <select class="filter-select" id="batches-status-filter" aria-label="Filter batches by status">
              <option value="">All Statuses</option>
              <option value="uploading">Uploading</option>
              <option value="validating">Validating</option>
              <option value="validated">Validated (Ready to Review)</option>
              <option value="validated_with_errors">Validated with Errors</option>
              <option value="committing">Committing</option>
              <option value="committed">Committed</option>
              <option value="committed_with_errors">Committed with Errors</option>
              <option value="failed">Failed</option>
            </select>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-batches">
              <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
            </button>
          </div>
        </div>

        <div class="card-body" id="batches-table-slot" style="padding-top: 1rem;">
          <div id="batches-table-loading" style="text-align: center; padding: 3rem 1rem; color: var(--neutral-500);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
            <span>Loading batches...</span>
          </div>
          <table id="batches-table" class="display nowrap dataTable" style="width: 100%; display: none;"></table>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-create-batch-view')?.addEventListener('click', () => {
      NewBatchModal.open();
    });

    this.container.querySelector('#btn-refresh-batches')?.addEventListener('click', () => {
      this.loadBatches();
    });

    const statusFilter = this.container.querySelector<HTMLSelectElement>('#batches-status-filter');
    statusFilter?.addEventListener('change', () => {
      this.activeStatus = statusFilter.value;
      this.loadBatches();
    });

    // Mount UI immediately and load data asynchronously so router never hangs
    void this.loadBatches();
    return this.container;
  }

  public async loadBatches(): Promise<void> {
    const loadingEl = this.container.querySelector<HTMLElement>('#batches-table-loading');
    const tableEl = this.container.querySelector<HTMLTableElement>('#batches-table');
    if (!this.dt && loadingEl) loadingEl.style.display = 'block';

    try {
      const response: PaginatedResponse<UploadSession> = await ApiClient.listUploads({
        limit: 100,
        status: this.activeStatus || undefined,
        $orderby: 'created_at desc',
        $count: true
      });

      if (loadingEl) loadingEl.style.display = 'none';
      if (tableEl) tableEl.style.display = 'table';

      this.updateMetrics(response);

      if (this.dt) {
        this.dt.clear();
        this.dt.rows.add(response.data);
        this.dt.draw();
      } else if (tableEl) {
        this.initDataTable(tableEl, response.data);
      }
    } catch (err) {
      if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `
          <div style="color: var(--danger);">
            <div style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Batches</div>
            <div style="font-size: 0.85rem;">${escapeHtml(err instanceof Error ? err.message : String(err))}</div>
          </div>
        `;
      }
    }
  }

  private initDataTable(tableEl: HTMLTableElement, data: UploadSession[]): void {
    if (typeof DataTable === 'undefined') {
      setTimeout(() => this.initDataTable(tableEl, data), 100);
      return;
    }

    this.dt = new DataTable(tableEl, {
      data,
      pageLength: 15,
      lengthMenu: [10, 15, 25, 50, 100],
      order: [[4, 'desc']],
      responsive: true,
      columns: [
        {
          title: 'Batch Name & File',
          data: null,
          render: (_data: unknown, _type: string, row: UploadSession) => `
            <div>
              <div class="cell-bold">${escapeHtml(row.batch_name)}</div>
              <div style="font-size: 0.75rem; color: var(--neutral-500); margin-top: 0.15rem;">
                <i class="fa-regular fa-file-excel" aria-hidden="true"></i> ${escapeHtml(row.file_name)} (${(row.file_size / 1024).toFixed(1)} KB)
              </div>
            </div>
          `
        },
        {
          title: 'Status',
          data: 'status',
          width: '150px',
          render: (val: string) => `
            <span class="badge badge-${val}">
              ${formatStatusLabel(val)}
            </span>
          `
        },
        {
          title: 'Progress',
          data: null,
          width: '180px',
          orderable: false,
          render: (_data: unknown, _type: string, row: UploadSession) => {
            const isComplete = row.status === 'committed' || row.status === 'committed_with_errors';
            const isValidating = row.status === 'validating';
            const isUploading = row.status === 'uploading';

            if (isUploading) {
              return `
                <div style="font-size: 0.75rem; color: var(--neutral-600); margin-bottom: 0.2rem;">
                  Uploading: ${row.upload_progress}% (${row.uploaded_chunks.length}/${row.chunk_count} chunks)
                </div>
                <div class="progress-container"><div class="progress-bar-fill animated" style="width: ${row.upload_progress}%;"></div></div>
              `;
            } else if (isValidating) {
              return `
                <div style="font-size: 0.75rem; color: var(--neutral-600); margin-bottom: 0.2rem;">
                  Validating: ${row.process_progress}% (${row.processed_rows}/${row.total_rows} rows)
                </div>
                <div class="progress-container"><div class="progress-bar-fill animated" style="width: ${row.process_progress}%;"></div></div>
              `;
            } else if (isComplete) {
              return `
                <div style="font-size: 0.75rem; color: var(--success-text); font-weight: 600;">
                  100% Processed (${row.onboarded_rows} onboarded)
                </div>
                <div class="progress-container"><div class="progress-bar-fill success" style="width: 100%;"></div></div>
              `;
            } else {
              return `
                <div style="font-size: 0.75rem; color: var(--neutral-500);">
                  ${row.total_rows} total rows
                </div>
                <div class="progress-container"><div class="progress-bar-fill" style="width: 100%;"></div></div>
              `;
            }
          }
        },
        {
          title: 'Row Breakdown',
          data: null,
          orderable: false,
          render: (_data: unknown, _type: string, row: UploadSession) => `
            <div style="font-size: 0.8rem; line-height: 1.4;">
              <span style="color: var(--success); font-weight: 600;">${row.valid_rows} Valid</span> |
              <span style="color: var(--danger); font-weight: 600;">${row.invalid_rows} Invalid</span> |
              <span style="color: var(--secondary); font-weight: 600;">${row.onboarded_rows} Onboarded</span>
            </div>
          `
        },
        {
          title: 'Uploaded At',
          data: 'created_at',
          width: '140px',
          className: 'cell-mono',
          render: (val: string) => `<span style="font-size: 0.8rem; color: var(--neutral-600);">${formatDate(val)}</span>`
        },
        {
          title: 'Action',
          data: null,
          orderable: false,
          searchable: false,
          width: '110px',
          className: 'text-right',
          render: (_data: unknown, _type: string, row: UploadSession) => {
            const isUploading = row.status === 'uploading';
            return `<a href="#/batch/${row.id}" class="btn ${isUploading ? 'btn-primary' : 'btn-secondary'} btn-sm">${isUploading ? 'Resume &rarr;' : 'Open &rarr;'}</a>`;
          }
        }
      ],
      language: {
        search: '_INPUT_',
        searchPlaceholder: 'Search batches by name or file...',
        emptyTable: 'No upload batches found',
        zeroRecords: 'No batches matched your filter criteria.'
      }
    });

    tableEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'a' || target.closest('a')) return;
      const tr = target.closest('tr');
      if (tr && this.dt) {
        const rowData = this.dt.row(tr).data() as UploadSession;
        if (rowData && rowData.id) {
          window.location.hash = `#/batch/${rowData.id}`;
        }
      }
    });
  }

  private updateMetrics(response: PaginatedResponse<UploadSession>): void {
    const items = response.data;
    const totalBatches = response.pagination.total;
    const pendingReview = items.filter(b => b.status === 'validated' || b.status === 'validated_with_errors').length;
    const committed = items.filter(b => b.status === 'committed' || b.status === 'committed_with_errors').length;
    const totalOnboarded = items.reduce((sum, b) => sum + (b.onboarded_rows || 0), 0);

    const totalEl = this.container.querySelector('#stat-total-batches');
    const pendingEl = this.container.querySelector('#stat-pending-review');
    const committedEl = this.container.querySelector('#stat-committed-batches');
    const onboardedEl = this.container.querySelector('#stat-total-onboarded');

    if (totalEl) totalEl.textContent = String(totalBatches);
    if (pendingEl) pendingEl.textContent = String(pendingReview);
    if (committedEl) committedEl.textContent = String(committed);
    if (onboardedEl) onboardedEl.textContent = String(totalOnboarded);
  }

  public destroy(): void {
    if (this.dt) {
      this.dt.destroy();
      this.dt = null;
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}
