import { ApiClient } from '../services/api-client';
import { SseClient, SseEventMessage } from '../services/sse-client';
import { ChunkedUploader } from '../services/chunked-uploader';
import { UploadSession, UploadRecord, PaginatedResponse } from '../types';
import { ToastManager } from '../components/toast';
import { Modal } from '../components/modal';
import { DataTable, DataTableColumn } from '../services/datatable';

export class BatchDetailView {
  private uploadId: string;
  private container: HTMLElement;
  private upload: UploadSession | null = null;
  private sseClient: SseClient | null = null;
  private currentRecordsResponse: PaginatedResponse<UploadRecord> | null = null;
  private dataTable: DataTable<UploadRecord>;

  // Filter state
  private activeStatusFilter = '';
  private searchQuery = '';
  private currentPage = 1;
  private pageSize = 20;
  private orderBy = 'row_number asc';

  constructor(uploadId: string) {
    this.uploadId = uploadId;
    this.container = document.createElement('div');
    this.container.className = 'batch-detail-view';

    const columns: DataTableColumn<UploadRecord>[] = [
      {
        id: 'row_number',
        header: 'Row',
        width: '75px',
        sortable: true,
        sortKey: 'row_number',
        className: 'cell-mono cell-bold',
        render: row => String(row.row_number)
      },
      {
        id: 'status',
        header: 'Status',
        width: '130px',
        sortable: true,
        sortKey: 'status',
        render: row => `
          <span class="badge badge-${row.status}">
            ${formatStatusLabel(row.status)}
          </span>
        `
      },
      {
        id: 'member_number',
        header: 'Member #',
        sortable: true,
        sortKey: 'member_number',
        className: 'cell-mono cell-bold',
        render: row => row.member_number ? escapeHtml(row.member_number) : '<span style="color: var(--neutral-400);">Not Set</span>'
      },
      {
        id: 'full_name',
        header: 'Name',
        sortable: true,
        sortKey: 'first_name',
        className: 'cell-bold',
        render: row => escapeHtml(`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—')
      },
      {
        id: 'identifiers',
        header: 'Phone / ID',
        className: 'cell-mono',
        render: row => {
          const id = row.id_number ? `ID: ${row.id_number}` : '';
          const tel = row.phone_number ? `Tel: ${row.phone_number}` : '';
          if (id && tel) return `<div>${escapeHtml(id)}</div><div style="color: var(--neutral-500); font-size: 0.75rem;">${escapeHtml(tel)}</div>`;
          return escapeHtml(id || tel || '—');
        }
      },
      {
        id: 'branch_account',
        header: 'Branch & Account',
        render: row => escapeHtml(`${row.branch || '—'} (${row.account_type || '—'})`)
      },
      {
        id: 'reason',
        header: 'Reason / Findings',
        className: 'cell-reason',
        render: row => row.reason
          ? `<span style="color: var(--danger-text);">${escapeHtml(row.reason)}</span>`
          : '<span style="color: var(--neutral-400); font-style: italic;">No errors</span>'
      },
      {
        id: 'actions',
        header: 'Action',
        hideable: false,
        width: '90px',
        align: 'right',
        render: row => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-secondary btn-sm';
          btn.textContent = 'Inspect';
          btn.addEventListener('click', e => {
            e.stopPropagation();
            this.openRecordInspector(row);
          });
          return btn;
        }
      }
    ];

    this.dataTable = new DataTable<UploadRecord>({
      tableId: `batch_records_${this.uploadId}`,
      columns,
      pageSize: this.pageSize,
      searchPlaceholder: 'Search by name, member #, email, ID...',
      initialSort: { columnId: 'row_number', direction: 'asc' },
      emptyTitle: 'No records found',
      emptyMessage: 'No records matched the selected status or search query.',
      onSearch: query => {
        this.searchQuery = query;
        this.currentPage = 1;
        this.loadRecords();
      },
      onSort: (_colId, dir, sortKey) => {
        this.orderBy = `${sortKey} ${dir}`;
        this.currentPage = 1;
        this.loadRecords();
      },
      onPageChange: page => {
        this.currentPage = page;
        this.loadRecords();
      },
      onPageSizeChange: size => {
        this.pageSize = size;
        this.currentPage = 1;
        this.loadRecords();
      },
      onRowClick: row => {
        this.openRecordInspector(row);
      }
    });

    this.setupExportActions();
  }

  private setupExportActions(): void {
    const csvBtn = document.createElement('button');
    csvBtn.type = 'button';
    csvBtn.className = 'btn btn-secondary btn-sm';
    csvBtn.title = 'Export records as CSV';
    csvBtn.innerHTML = '<i class="fa-solid fa-file-csv"></i> CSV';
    csvBtn.addEventListener('click', async () => {
      try {
        ToastManager.info('Preparing CSV export...');
        await ApiClient.exportRecords(this.uploadId, 'csv', this.activeStatusFilter || undefined);
        ToastManager.success('CSV downloaded successfully.');
      } catch (err) {
        ToastManager.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    const xlsxBtn = document.createElement('button');
    xlsxBtn.type = 'button';
    xlsxBtn.className = 'btn btn-secondary btn-sm';
    xlsxBtn.title = 'Export records as XLSX';
    xlsxBtn.innerHTML = '<i class="fa-solid fa-file-excel"></i> XLSX';
    xlsxBtn.addEventListener('click', async () => {
      try {
        ToastManager.info('Preparing Excel export...');
        await ApiClient.exportRecords(this.uploadId, 'xlsx', this.activeStatusFilter || undefined);
        ToastManager.success('Excel workbook downloaded successfully.');
      } catch (err) {
        ToastManager.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    const invalidBtn = document.createElement('button');
    invalidBtn.type = 'button';
    invalidBtn.className = 'btn btn-outline-primary btn-sm';
    invalidBtn.title = 'Download only invalid & duplicate records';
    invalidBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Invalid Rows';
    invalidBtn.addEventListener('click', async () => {
      try {
        ToastManager.info('Downloading invalid and duplicate rows...');
        await ApiClient.downloadInvalidRows(this.uploadId);
        ToastManager.success('Invalid rows workbook downloaded.');
      } catch (err) {
        ToastManager.error(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    this.dataTable.addCustomAction(csvBtn);
    this.dataTable.addCustomAction(xlsxBtn);
    this.dataTable.addCustomAction(invalidBtn);
  }

  public async render(): Promise<HTMLElement> {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <a href="#/batches" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: var(--neutral-500); text-decoration: none; margin-bottom: 0.5rem;">
            ← Back to All Batches
          </a>
          <h2 id="batch-title" style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900); display: flex; align-items: center; gap: 0.75rem;">
            Loading Batch...
          </h2>
          <p id="batch-description" style="color: var(--neutral-600); font-size: 0.9rem; margin-top: 0.25rem;"></p>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;" id="batch-header-actions">
          <!-- Actions populated dynamically -->
        </div>
      </div>

      <!-- Live SSE Progress / Status Banner -->
      <div id="live-progress-container" style="display: none; margin-bottom: 1.5rem;"></div>

      <!-- Review & Commit Banner -->
      <div id="commit-action-banner" style="display: none; margin-bottom: 1.5rem;"></div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="batch-stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Rows</span>
            <i class="fa-solid fa-chart-simple" style="color: var(--neutral-400);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" id="stat-total">-</div>
          <div class="stat-subtext">Workbook records</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Valid Eligible</span>
            <i class="fa-solid fa-circle-check" style="color: var(--success);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--success);" id="stat-valid">-</div>
          <div class="stat-subtext">Ready for onboarding</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Invalid Rows</span>
            <i class="fa-solid fa-circle-xmark" style="color: var(--danger);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--danger);" id="stat-invalid">-</div>
          <div class="stat-subtext">Core mismatch or errors</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Duplicates</span>
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--warning);" id="stat-duplicates">-</div>
          <div class="stat-subtext">Already onboarded / repeated</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Onboarded</span>
            <i class="fa-solid fa-users" style="color: var(--secondary);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--secondary);" id="stat-onboarded">-</div>
          <div class="stat-subtext">Confirmed in digital banking</div>
        </div>
      </div>

      <!-- Records Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Workbook Records</h3>
            <p class="card-subtitle">Inspect individual records, toggle columns, search in real-time, and export results</p>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <div class="filter-tabs" id="status-filter-tabs">
              <button type="button" class="filter-tab active" data-status="">All <span class="filter-tab-count" id="count-all">0</span></button>
              <button type="button" class="filter-tab" data-status="valid">Valid <span class="filter-tab-count" id="count-valid">0</span></button>
              <button type="button" class="filter-tab" data-status="onboarded">Onboarded <span class="filter-tab-count" id="count-onboarded">0</span></button>
              <button type="button" class="filter-tab" data-status="invalid">Invalid <span class="filter-tab-count" id="count-invalid">0</span></button>
              <button type="button" class="filter-tab" data-status="duplicate">Duplicate <span class="filter-tab-count" id="count-duplicate">0</span></button>
            </div>
          </div>
        </div>

        <div class="card-body" id="records-table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>

      <!-- Live Event Feed Collapsible Drawer -->
      <div class="card" id="event-feed-card" style="margin-top: 1rem;">
        <div class="card-header" style="cursor: pointer;" id="event-feed-toggle">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-tower-broadcast" style="color: var(--primary);" aria-hidden="true"></i>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--neutral-800);">Server-Sent Events (SSE) Stream</h4>
            <span class="badge badge-validating" id="sse-connection-pill">Connecting</span>
          </div>
          <span id="event-feed-chevron" style="color: var(--neutral-400); font-size: 0.85rem;"><i class="fa-solid fa-chevron-down"></i> Click to expand log</span>
        </div>
        <div class="card-body" id="event-feed-body" style="display: none; padding-top: 0.5rem;">
          <div class="event-log-container" id="event-log-list">
            <div style="color: #64748b; font-style: italic;">Awaiting server events...</div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#records-table-slot')?.appendChild(this.dataTable.getElement());

    this.bindEvents();
    await this.loadBatch();

    return this.container;
  }

  private bindEvents(): void {
    // Status filter tabs
    this.container.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeStatusFilter = tab.dataset.status || '';
        this.currentPage = 1;
        this.loadRecords();
      });
    });

    // Toggle event feed
    const feedToggle = this.container.querySelector('#event-feed-toggle');
    const feedBody = this.container.querySelector<HTMLElement>('#event-feed-body');
    const feedChevron = this.container.querySelector('#event-feed-chevron');
    feedToggle?.addEventListener('click', () => {
      if (feedBody) {
        const isHidden = feedBody.style.display === 'none';
        feedBody.style.display = isHidden ? 'block' : 'none';
        if (feedChevron) {
          feedChevron.innerHTML = isHidden
            ? '<i class="fa-solid fa-chevron-up"></i> Click to collapse log'
            : '<i class="fa-solid fa-chevron-down"></i> Click to expand log';
        }
      }
    });
  }

  public async loadBatch(): Promise<void> {
    try {
      this.upload = await ApiClient.getUpload(this.uploadId);
      this.renderHeader();
      this.renderStats();
      this.updateBanners();
      await this.loadRecords();
      this.initSseStream();
    } catch (err) {
      ToastManager.error(`Failed to load batch: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private renderHeader(): void {
    if (!this.upload) return;
    const titleEl = this.container.querySelector('#batch-title')!;
    const descEl = this.container.querySelector('#batch-description')!;
    const actionsEl = this.container.querySelector('#batch-header-actions')!;

    titleEl.innerHTML = `
      <span>${escapeHtml(this.upload.batch_name)}</span>
      <span class="badge badge-${this.upload.status}">${formatStatusLabel(this.upload.status)}</span>
    `;

    descEl.textContent = this.upload.description || `File: ${this.upload.file_name} (${(this.upload.file_size / 1024).toFixed(1)} KB)`;

    actionsEl.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-batch">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
      </button>
    `;

    actionsEl.querySelector('#btn-refresh-batch')?.addEventListener('click', () => {
      this.loadBatch();
    });
  }

  private renderStats(): void {
    if (!this.upload) return;
    this.container.querySelector('#stat-total')!.textContent = String(this.upload.total_rows || 0);
    this.container.querySelector('#stat-valid')!.textContent = String(this.upload.valid_rows || 0);
    this.container.querySelector('#stat-invalid')!.textContent = String(this.upload.invalid_rows || 0);
    this.container.querySelector('#stat-onboarded')!.textContent = String(this.upload.onboarded_rows || 0);

    const dupCount = this.currentRecordsResponse?.status_counts?.duplicate ?? 0;
    this.container.querySelector('#stat-duplicates')!.textContent = String(dupCount);
  }

  private updateBanners(): void {
    if (!this.upload) return;
    const progressEl = this.container.querySelector<HTMLElement>('#live-progress-container')!;
    const commitEl = this.container.querySelector<HTMLElement>('#commit-action-banner')!;

    // Incomplete upload banner
    if (this.upload.status === 'uploading') {
      progressEl.style.display = 'block';
      const uploadedChunks = this.upload.uploaded_chunks.length;
      const totalChunks = this.upload.chunk_count || 1;
      progressEl.innerHTML = `
        <div class="banner banner-warning">
          <span class="banner-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Upload Incomplete (${this.upload.upload_progress}% Transferred)</div>
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">
              The server has received ${uploadedChunks} of ${totalChunks} chunks for <strong>${escapeHtml(this.upload.file_name)}</strong>.
              You can select the file to resume uploading remaining chunks without starting over.
            </p>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem;">
              <input type="file" id="resume-file-picker" accept=".xlsx" style="display: none;" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-select-resume-file">
                <i class="fa-solid fa-folder-open" aria-hidden="true"></i> Select File to Resume Upload
              </button>
            </div>
            <div id="resume-progress-area" style="margin-top: 0.75rem; display: none;">
              <div class="progress-container" style="height: 8px;">
                <div class="progress-bar-fill animated" id="resume-progress-fill" style="width: ${this.upload.upload_progress}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      const filePicker = progressEl.querySelector<HTMLInputElement>('#resume-file-picker')!;
      const selectBtn = progressEl.querySelector<HTMLButtonElement>('#btn-select-resume-file')!;
      const resumeProgressArea = progressEl.querySelector<HTMLElement>('#resume-progress-area')!;
      const resumeFill = progressEl.querySelector<HTMLElement>('#resume-progress-fill')!;

      selectBtn.addEventListener('click', () => filePicker.click());
      filePicker.addEventListener('change', async () => {
        if (!filePicker.files || !filePicker.files[0]) return;
        const file = filePicker.files[0];
        selectBtn.disabled = true;
        selectBtn.textContent = 'Resuming...';
        resumeProgressArea.style.display = 'block';

        const uploader = new ChunkedUploader({
          batchName: this.upload!.batch_name,
          description: this.upload!.description,
          file,
          onProgress: p => {
            resumeFill.style.width = `${p.percent}%`;
          },
          onComplete: () => {
            ToastManager.success('Upload resumed and completed. Validation started.');
            this.loadBatch();
          },
          onError: err => {
            ToastManager.error(`Resume error: ${err.message}`);
            selectBtn.disabled = false;
            selectBtn.innerHTML = '<i class="fa-solid fa-folder-open" aria-hidden="true"></i> Select File to Resume Upload';
          }
        });

        try {
          await uploader.start();
        } catch (e) {
          console.error(e);
        }
      });
      return;
    }

    // Live validation progress banner
    if (this.upload.status === 'validating' || this.upload.status === 'committing') {
      progressEl.style.display = 'block';
      const pct = this.upload.status === 'committing' ? 95 : (this.upload.process_progress || 0);
      progressEl.innerHTML = `
        <div class="banner banner-info">
          <span class="banner-icon"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">
              ${this.upload.status === 'committing' ? 'Onboarding Eligible Members...' : 'Validation In Progress...'}
            </div>
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">
              ${this.upload.status === 'committing'
                ? 'Registering members with core banking and activating digital accounts.'
                : `Checked ${this.upload.processed_rows} of ${this.upload.total_rows} rows against core banking records.`}
            </p>
            <div class="progress-container" style="height: 8px;">
              <div class="progress-bar-fill animated" style="width: ${pct}%;"></div>
            </div>
          </div>
        </div>
      `;
    } else {
      progressEl.style.display = 'none';
    }

    // Review & commit banner
    if (this.upload.status === 'validated' || this.upload.status === 'validated_with_errors') {
      commitEl.style.display = 'block';
      const validCount = this.upload.valid_rows || 0;
      const invalidCount = this.upload.invalid_rows || 0;

      commitEl.innerHTML = `
        <div class="banner banner-warning">
          <span class="banner-icon"><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Staff Review Required — No Members Onboarded Yet</div>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">
              Validation is complete. In accordance with digital banking controls, <strong>no members have been onboarded yet</strong>.
              Please inspect the rows below. There are <strong>${validCount} eligible valid rows</strong> and <strong>${invalidCount} invalid / duplicate rows</strong>.
            </p>
            
            <div style="margin-top: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="check-confirm-review" style="width: 18px; height: 18px; cursor: pointer;" />
              <label for="check-confirm-review" style="font-size: 0.875rem; font-weight: 600; cursor: pointer; color: var(--neutral-900);">
                I confirm that I have reviewed the validation results and authorize onboarding of all valid rows.
              </label>
            </div>

            <div class="banner-actions">
              <button type="button" class="btn btn-success" id="btn-commit-batch" disabled>
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Commit Valid Rows (${validCount} Members)
              </button>
            </div>
          </div>
        </div>
      `;

      const checkbox = commitEl.querySelector<HTMLInputElement>('#check-confirm-review')!;
      const commitBtn = commitEl.querySelector<HTMLButtonElement>('#btn-commit-batch')!;

      checkbox.addEventListener('change', () => {
        commitBtn.disabled = !checkbox.checked || validCount === 0;
      });

      commitBtn.addEventListener('click', async () => {
        commitBtn.disabled = true;
        commitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Committing Members...';
        try {
          ToastManager.info('Committing valid members to digital banking...');
          const commitRes = await ApiClient.commitValidatedUpload(this.uploadId, true);
          ToastManager.success(`Successfully committed! ${commitRes.committed_rows} members have been onboarded.`);
          await this.loadBatch();
        } catch (err) {
          ToastManager.error(`Commit failed: ${err instanceof Error ? err.message : String(err)}`);
          commitBtn.disabled = false;
          commitBtn.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Commit Valid Rows (${validCount} Members)`;
        }
      });
    } else if (this.upload.status === 'committed' || this.upload.status === 'committed_with_errors') {
      commitEl.style.display = 'block';
      const onboardedCount = this.upload.onboarded_rows || 0;
      const invalidCount = this.upload.invalid_rows || 0;

      commitEl.innerHTML = `
        <div class="banner banner-success">
          <span class="banner-icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Batch Successfully Committed</div>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">
              <strong>${onboardedCount} members</strong> have been activated in digital banking.
              ${invalidCount > 0 ? `The ${invalidCount} invalid or duplicate rows remain preserved in this batch for your audit.` : ''}
            </p>
            <div class="banner-actions">
              <a href="#/members" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-users" aria-hidden="true"></i> View Onboarded Members Directory
              </a>
              ${invalidCount > 0 ? `<button type="button" class="btn btn-outline-primary btn-sm" id="btn-download-invalid-banner"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Download Invalid Rows (.xlsx)</button>` : ''}
            </div>
          </div>
        </div>
      `;

      commitEl.querySelector('#btn-download-invalid-banner')?.addEventListener('click', async () => {
        try {
          await ApiClient.downloadInvalidRows(this.uploadId);
        } catch (err) {
          ToastManager.error(String(err));
        }
      });
    } else {
      commitEl.style.display = 'none';
    }
  }

  public async loadRecords(): Promise<void> {
    this.dataTable.setLoading(true);

    try {
      let filterExpr = '';
      if (this.searchQuery) {
        const q = this.searchQuery.replace(/'/g, "''");
        filterExpr = `contains(first_name, '${q}') or contains(last_name, '${q}') or contains(member_number, '${q}') or contains(email, '${q}')`;
      }

      this.currentRecordsResponse = await ApiClient.listUploadRecords(this.uploadId, {
        page: this.currentPage,
        limit: this.pageSize,
        status: this.activeStatusFilter || undefined,
        $filter: filterExpr || undefined,
        $orderby: this.orderBy,
        $count: true
      });

      this.dataTable.setData(
        this.currentRecordsResponse.data,
        this.currentRecordsResponse.pagination.total,
        this.currentRecordsResponse.pagination.page
      );
      this.updateStatusTabCounts();
    } catch (err) {
      this.dataTable.setError(err instanceof Error ? err.message : String(err));
    }
  }

  private updateStatusTabCounts(): void {
    if (!this.currentRecordsResponse) return;
    const counts = this.currentRecordsResponse.status_counts || {};

    const allCount = Object.values(counts).reduce((a, b) => a + b, 0) || this.currentRecordsResponse.pagination.total;
    const countAllEl = this.container.querySelector('#count-all');
    const countValidEl = this.container.querySelector('#count-valid');
    const countOnboardedEl = this.container.querySelector('#count-onboarded');
    const countInvalidEl = this.container.querySelector('#count-invalid');
    const countDupEl = this.container.querySelector('#count-duplicate');
    const statDupEl = this.container.querySelector('#stat-duplicates');

    if (countAllEl) countAllEl.textContent = String(allCount);
    if (countValidEl) countValidEl.textContent = String(counts.valid || 0);
    if (countOnboardedEl) countOnboardedEl.textContent = String(counts.onboarded || 0);
    if (countInvalidEl) countInvalidEl.textContent = String(counts.invalid || 0);
    if (countDupEl) countDupEl.textContent = String(counts.duplicate || 0);
    if (statDupEl) statDupEl.textContent = String(counts.duplicate || 0);
  }

  private openRecordInspector(record: UploadRecord): void {
    const content = document.createElement('div');
    content.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Status</div>
          <div style="margin-top: 0.25rem;">
            <span class="badge badge-${record.status}">${formatStatusLabel(record.status)}</span>
          </div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Workbook Row</div>
          <div style="font-weight: 700; font-family: var(--font-mono); margin-top: 0.25rem;">Row #${record.row_number}</div>
        </div>
      </div>

      ${record.reason ? `
        <div style="background-color: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--danger-text);">Validation Finding:</div>
          <div style="font-size: 0.85rem; color: var(--danger-text); margin-top: 0.2rem;">${escapeHtml(record.reason)}</div>
        </div>
      ` : ''}

      <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
        <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--neutral-800);">Member Details</h4>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; font-size: 0.875rem;">
          <dt style="color: var(--neutral-500);">Full Name:</dt>
          <dd style="font-weight: 600;">${escapeHtml(record.first_name)} ${escapeHtml(record.last_name)}</dd>

          <dt style="color: var(--neutral-500);">Member Number:</dt>
          <dd class="cell-mono">${record.member_number || '—'}</dd>

          <dt style="color: var(--neutral-500);">National ID:</dt>
          <dd class="cell-mono">${record.id_number || '—'}</dd>

          <dt style="color: var(--neutral-500);">Phone Number:</dt>
          <dd class="cell-mono">${record.phone_number || '—'}</dd>

          <dt style="color: var(--neutral-500);">Date of Birth:</dt>
          <dd class="cell-mono">${record.date_of_birth || '—'}</dd>

          <dt style="color: var(--neutral-500);">Email Address:</dt>
          <dd>${record.email || '—'}</dd>

          <dt style="color: var(--neutral-500);">Branch:</dt>
          <dd>${record.branch || '—'}</dd>

          <dt style="color: var(--neutral-500);">Account Type:</dt>
          <dd style="text-transform: capitalize;">${record.account_type || '—'}</dd>
        </dl>
      </div>
    `;

    const modal = new Modal({
      title: `Inspect Record — Row #${record.row_number}`,
      content,
      footerButtons: [
        {
          label: 'Close',
          className: 'btn-secondary',
          onClick: m => m.close()
        }
      ]
    });
    modal.open();
  }

  private initSseStream(): void {
    if (this.sseClient) return;

    this.sseClient = new SseClient(this.uploadId);

    const connectionPill = this.container.querySelector('#sse-connection-pill');
    const logList = this.container.querySelector('#event-log-list');

    this.sseClient.onStateChange(state => {
      if (connectionPill) {
        connectionPill.textContent = state.toUpperCase();
        if (state === 'connected') {
          connectionPill.className = 'badge badge-valid';
        } else if (state === 'reconnecting') {
          connectionPill.className = 'badge badge-warning';
        } else {
          connectionPill.className = 'badge badge-validated';
        }
      }
    });

    this.sseClient.onMessage((msg: SseEventMessage) => {
      if (logList) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const timeStr = msg.timestamp.toTimeString().split(' ')[0];
        entry.innerHTML = `
          <span class="log-time">[${timeStr}]</span>
          <span class="log-badge ${getEventBadgeClass(msg.event)}">${msg.event}</span>
          <span>${formatEventPayload(msg.event, msg.payload)}</span>
        `;
        logList.insertBefore(entry, logList.firstChild);
      }

      if (['row_processed', 'validation_completed', 'row_committed', 'commit_completed'].includes(msg.event)) {
        this.refreshStateFromEvent(msg);
      }
    });

    this.sseClient.connect();
  }

  private async refreshStateFromEvent(msg: SseEventMessage): Promise<void> {
    if (msg.event === 'validation_completed' || msg.event === 'commit_completed') {
      ToastManager.info(`Server reported: ${msg.event.replace('_', ' ')}`);
      await this.loadBatch();
    } else if (msg.event === 'row_processed') {
      const payload = msg.payload as { processed_rows?: number; row_number?: number };
      if (this.upload && payload.processed_rows) {
        this.upload.processed_rows = payload.processed_rows;
        this.updateBanners();
      }
    }
  }

  public destroy(): void {
    if (this.sseClient) {
      this.sseClient.close();
      this.sseClient = null;
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

function getEventBadgeClass(event: string): string {
  if (event.includes('completed') || event === 'upload_created') return 'success';
  if (event.includes('started') || event.includes('processed')) return 'info';
  if (event.includes('error') || event === 'failed') return 'danger';
  return 'warning';
}

function formatEventPayload(event: string, payload: Record<string, unknown>): string {
  if (event === 'row_processed') {
    return `Row ${payload.row_number} checked: status=${payload.status}`;
  }
  if (event === 'row_committed') {
    return `Row ${payload.row_number} committed to digital banking (ID: ${String(payload.member_id || '').slice(0, 8)})`;
  }
  if (event === 'validation_completed') {
    return `Validation finished. Valid: ${payload.valid_rows}, Invalid: ${payload.invalid_rows}`;
  }
  if (event === 'commit_completed') {
    return `Commit complete. ${payload.committed_rows} members onboarded.`;
  }
  return JSON.stringify(payload);
}
