import { ApiClient } from '../services/api-client';
import { UploadSession, PaginatedResponse } from '../types';
import { NewBatchModal } from './new-batch-modal';
import { DataTable, DataTableColumn } from '../components/data-table';

export class BatchesView {
  private container: HTMLElement;
  private dataTable: DataTable<UploadSession>;
  private currentPage = 1;
  private pageSize = 15;
  private activeStatus = '';
  private searchQuery = '';
  private orderBy = 'created_at desc';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'batches-view';

    const columns: DataTableColumn<UploadSession>[] = [
      {
        id: 'batch_name',
        header: 'Batch Name & File',
        sortable: true,
        sortKey: 'batch_name',
        render: row => `
          <div>
            <div class="cell-bold">${escapeHtml(row.batch_name)}</div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); margin-top: 0.15rem;">
              <i class="fa-regular fa-file-excel" aria-hidden="true"></i> ${escapeHtml(row.file_name)} (${(row.file_size / 1024).toFixed(1)} KB)
            </div>
          </div>
        `
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortKey: 'status',
        width: '150px',
        render: row => `
          <span class="badge badge-${row.status}">
            ${formatStatusLabel(row.status)}
          </span>
        `
      },
      {
        id: 'progress',
        header: 'Progress',
        width: '180px',
        render: row => {
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
        id: 'row_breakdown',
        header: 'Row Breakdown',
        render: row => `
          <div style="font-size: 0.8rem; line-height: 1.4;">
            <span style="color: var(--success); font-weight: 600;">${row.valid_rows} Valid</span> |
            <span style="color: var(--danger); font-weight: 600;">${row.invalid_rows} Invalid</span> |
            <span style="color: var(--secondary); font-weight: 600;">${row.onboarded_rows} Onboarded</span>
          </div>
        `
      },
      {
        id: 'created_at',
        header: 'Uploaded At',
        sortable: true,
        sortKey: 'created_at',
        width: '140px',
        className: 'cell-mono',
        render: row => `<span style="font-size: 0.8rem; color: var(--neutral-600);">${formatDate(row.created_at)}</span>`
      },
      {
        id: 'actions',
        header: 'Action',
        hideable: false,
        width: '110px',
        align: 'right',
        render: row => {
          const isUploading = row.status === 'uploading';
          const a = document.createElement('a');
          a.href = `#/batch/${row.id}`;
          a.className = `btn ${isUploading ? 'btn-primary' : 'btn-secondary'} btn-sm`;
          a.textContent = isUploading ? 'Resume →' : 'Open →';
          return a;
        }
      }
    ];

    this.dataTable = new DataTable<UploadSession>({
      tableId: 'batches_table',
      columns,
      pageSize: this.pageSize,
      searchPlaceholder: 'Search batches by name or file...',
      initialSort: { columnId: 'created_at', direction: 'desc' },
      emptyTitle: 'No upload batches found',
      emptyMessage: 'No batches matched your filter criteria.',
      onSearch: query => {
        this.searchQuery = query;
        this.currentPage = 1;
        this.loadBatches();
      },
      onSort: (_colId, dir, sortKey) => {
        this.orderBy = `${sortKey} ${dir}`;
        this.currentPage = 1;
        this.loadBatches();
      },
      onPageChange: page => {
        this.currentPage = page;
        this.loadBatches();
      },
      onPageSizeChange: size => {
        this.pageSize = size;
        this.currentPage = 1;
        this.loadBatches();
      },
      onRowClick: row => {
        window.location.hash = `#/batch/${row.id}`;
      }
    });

    this.setupCustomFilters();
  }

  private setupCustomFilters(): void {
    const statusSelect = document.createElement('select');
    statusSelect.className = 'filter-select';
    statusSelect.setAttribute('aria-label', 'Filter batches by status');
    statusSelect.innerHTML = `
      <option value="">All Statuses</option>
      <option value="uploading">Uploading</option>
      <option value="validating">Validating</option>
      <option value="validated">Validated (Ready to Review)</option>
      <option value="validated_with_errors">Validated with Errors</option>
      <option value="committing">Committing</option>
      <option value="committed">Committed</option>
      <option value="committed_with_errors">Committed with Errors</option>
      <option value="failed">Failed</option>
    `;

    statusSelect.addEventListener('change', () => {
      this.activeStatus = statusSelect.value;
      this.currentPage = 1;
      this.loadBatches();
    });

    this.dataTable.setCustomFilterSlot(statusSelect);
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
            <p class="card-subtitle">Search, filter columns, sort by status or date, and open batches</p>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-batches">
            <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
          </button>
        </div>

        <div class="card-body" id="batches-table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>
    `;

    this.container.querySelector('#batches-table-slot')?.appendChild(this.dataTable.getElement());

    this.container.querySelector('#btn-create-batch-view')?.addEventListener('click', () => {
      NewBatchModal.open();
    });

    this.container.querySelector('#btn-refresh-batches')?.addEventListener('click', () => {
      this.loadBatches();
    });

    await this.loadBatches();
    return this.container;
  }

  public async loadBatches(): Promise<void> {
    this.dataTable.setLoading(true);

    try {
      let filterExpr = '';
      if (this.searchQuery) {
        const q = this.searchQuery.replace(/'/g, "''");
        filterExpr = `contains(batch_name, '${q}') or contains(file_name, '${q}')`;
      }

      const response: PaginatedResponse<UploadSession> = await ApiClient.listUploads({
        page: this.currentPage,
        limit: this.pageSize,
        status: this.activeStatus || undefined,
        $filter: filterExpr || undefined,
        $orderby: this.orderBy,
        $count: true
      });

      this.dataTable.setData(response.data, response.pagination.total, response.pagination.page);
      this.updateMetrics(response);
    } catch (err) {
      this.dataTable.setError(err instanceof Error ? err.message : String(err));
    }
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

  public destroy(): void {}
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
