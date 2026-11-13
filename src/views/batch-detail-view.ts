import { ApiClient } from '../services/api-client';
import { SseClient, SseEventMessage } from '../services/sse-client';
import { ChunkedUploader } from '../services/chunked-uploader';
import { UploadSession, UploadRecord, PaginatedResponse } from '../types';
import { ToastManager } from '../components/toast';
import { Modal } from '../components/modal';

export class BatchDetailView {
  private uploadId: string;
  private container: HTMLElement;
  private upload: UploadSession | null = null;
  private sseClient: SseClient | null = null;
  private currentRecordsResponse: PaginatedResponse<UploadRecord> | null = null;
  private dt: any = null;

  // Filter state
  private activeStatusFilter = '';

  constructor(uploadId: string) {
    this.uploadId = uploadId;
    this.container = document.createElement('div');
    this.container.className = 'batch-detail-view';
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
        <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 class="card-title">Workbook Records</h3>
            <p class="card-subtitle">Inspect individual records, search in real-time, filter status, and export results</p>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <div class="filter-tabs" id="status-filter-tabs">
              <button type="button" class="filter-tab active" data-status="">All <span class="filter-tab-count" id="count-all">0</span></button>
              <button type="button" class="filter-tab" data-status="valid">Valid <span class="filter-tab-count" id="count-valid">0</span></button>
              <button type="button" class="filter-tab" data-status="onboarded">Onboarded <span class="filter-tab-count" id="count-onboarded">0</span></button>
              <button type="button" class="filter-tab" data-status="invalid">Invalid <span class="filter-tab-count" id="count-invalid">0</span></button>
              <button type="button" class="filter-tab" data-status="duplicate">Duplicate <span class="filter-tab-count" id="count-duplicate">0</span></button>
            </div>

            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-export-csv" title="Export records as CSV">
                <i class="fa-solid fa-file-csv" aria-hidden="true"></i> CSV
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-export-xlsx" title="Export records as XLSX">
                <i class="fa-solid fa-file-excel" aria-hidden="true"></i> XLSX
              </button>
              <button type="button" class="btn btn-outline-primary btn-sm" id="btn-export-invalid" title="Download only invalid & duplicate records">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Invalid Rows
              </button>
            </div>
          </div>
        </div>

        <div class="card-body" id="records-table-slot" style="padding-top: 1rem;">
          <div id="records-table-loading" style="text-align: center; padding: 3rem 1rem; color: var(--neutral-500);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
            <span>Loading records...</span>
          </div>
          <table id="records-table" class="display dataTable" style="width: 100%; display: none;"></table>
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

    this.bindEvents();
    // Mount UI immediately and load data asynchronously so router never hangs
    void this.loadBatch();

    return this.container;
  }

  private bindEvents(): void {
    // Status filter tabs
    this.container.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeStatusFilter = tab.dataset.status || '';
        this.loadRecords();
      });
    });

    // Export buttons
    this.container.querySelector('#btn-export-csv')?.addEventListener('click', async () => {
      try {
        ToastManager.info('Preparing CSV export...');
        await ApiClient.exportRecords(this.uploadId, 'csv', this.activeStatusFilter || undefined);
        ToastManager.success('CSV downloaded successfully.');
      } catch (err) {
        ToastManager.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    this.container.querySelector('#btn-export-xlsx')?.addEventListener('click', async () => {
      try {
        ToastManager.info('Preparing Excel export...');
        await ApiClient.exportRecords(this.uploadId, 'xlsx', this.activeStatusFilter || undefined);
        ToastManager.success('Excel workbook downloaded successfully.');
      } catch (err) {
        ToastManager.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    this.container.querySelector('#btn-export-invalid')?.addEventListener('click', async () => {
      try {
        ToastManager.info('Downloading invalid and duplicate rows...');
        await ApiClient.downloadInvalidRows(this.uploadId);
        ToastManager.success('Invalid rows workbook downloaded.');
      } catch (err) {
        ToastManager.error(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
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
          existingSession: this.upload!,
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
          await uploader.resume();
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
    const loadingEl = this.container.querySelector<HTMLElement>('#records-table-loading');
    const tableEl = this.container.querySelector<HTMLTableElement>('#records-table');
    if (!this.dt && loadingEl) loadingEl.style.display = 'block';

    try {
      this.currentRecordsResponse = await ApiClient.listUploadRecords(this.uploadId, {
        limit: 500,
        status: this.activeStatusFilter || undefined,
        $orderby: 'row_number asc',
        $count: true
      });

      if (loadingEl) loadingEl.style.display = 'none';
      if (tableEl) tableEl.style.display = 'table';

      this.updateStatusTabCounts();

      if (this.dt) {
        this.dt.clear();
        this.dt.rows.add(this.currentRecordsResponse.data);
        this.dt.draw();
      } else if (tableEl) {
        this.initDataTable(tableEl, this.currentRecordsResponse.data);
      }
    } catch (err) {
      if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `
          <div style="color: var(--danger);">
            <div style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Records</div>
            <div style="font-size: 0.85rem;">${escapeHtml(err instanceof Error ? err.message : String(err))}</div>
          </div>
        `;
      }
    }
  }

  private initDataTable(tableEl: HTMLTableElement, data: UploadRecord[]): void {
    if (typeof DataTable === 'undefined') {
      setTimeout(() => this.initDataTable(tableEl, data), 100);
      return;
    }

    this.dt = new DataTable(tableEl, {
      data,
      pageLength: 20,
      lengthMenu: [10, 20, 50, 100],
      order: [[0, 'asc']],
      responsive: true,
      columns: [
        {
          title: 'Row',
          data: 'row_number',
          width: '75px',
          className: 'cell-mono cell-bold',
          render: (val: number) => String(val)
        },
        {
          title: 'Status',
          data: 'status',
          width: '130px',
          render: (val: string) => `
            <span class="badge badge-${val}">
              ${formatStatusLabel(val)}
            </span>
          `
        },
        {
          title: 'Member #',
          data: 'member_number',
          className: 'cell-mono cell-bold',
          render: (val: string) => val ? escapeHtml(val) : '<span style="color: var(--neutral-400);">Not Set</span>'
        },
        {
          title: 'Name',
          data: null,
          className: 'cell-bold',
          render: (_data: unknown, _type: string, row: UploadRecord) => escapeHtml(`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—')
        },
        {
          title: 'Phone Number',
          data: 'phone_number',
          className: 'cell-mono',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'National ID',
          data: 'id_number',
          className: 'cell-mono',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'Branch',
          data: 'branch',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'Account Type',
          data: 'account_type',
          render: (val: string) => `<span style="text-transform: capitalize;">${escapeHtml(val || '—')}</span>`
        },
        {
          title: 'Reason / Findings',
          data: 'reason',
          className: 'cell-reason',
          render: (val: string) => val
            ? `<span style="color: var(--danger-text);">${escapeHtml(val)}</span>`
            : '<span style="color: var(--neutral-400); font-style: italic;">No errors</span>'
        },
        {
          title: 'Action',
          data: null,
          orderable: false,
          searchable: false,
          width: '90px',
          className: 'text-right',
          render: () => `<button type="button" class="btn btn-secondary btn-sm btn-inspect-record">Inspect</button>`
        }
      ],
      language: {
        search: '_INPUT_',
        searchPlaceholder: 'Search records by name, ID, member #...',
        emptyTable: 'No records found',
        zeroRecords: 'No records matched the selected status or query.'
      }
    });

    tableEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tr = target.closest('tr');
      if (tr && this.dt) {
        const rowData = this.dt.row(tr).data() as UploadRecord;
        if (rowData) {
          this.openRecordInspector(rowData);
        }
      }
    });
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
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--danger-text); margin-bottom: 0.25rem;">Validation Finding</div>
          <div style="font-size: 0.85rem; color: var(--danger-text);">${escapeHtml(record.reason)}</div>
        </div>
      ` : ''}

      <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--neutral-700); text-transform: uppercase; margin-bottom: 0.75rem;">Member Record Details</h4>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; font-size: 0.875rem;">
          <dt style="color: var(--neutral-500);">Member Number:</dt>
          <dd class="cell-mono">${escapeHtml(record.member_number || '—')}</dd>

          <dt style="color: var(--neutral-500);">Full Name:</dt>
          <dd>${escapeHtml(`${record.first_name || ''} ${record.last_name || ''}`.trim() || '—')}</dd>

          <dt style="color: var(--neutral-500);">National ID:</dt>
          <dd class="cell-mono">${escapeHtml(record.id_number || '—')}</dd>

          <dt style="color: var(--neutral-500);">Phone Number:</dt>
          <dd class="cell-mono">${escapeHtml(record.phone_number || '—')}</dd>

          <dt style="color: var(--neutral-500);">Date of Birth:</dt>
          <dd class="cell-mono">${escapeHtml(record.date_of_birth || '—')}</dd>

          <dt style="color: var(--neutral-500);">Email Address:</dt>
          <dd>${escapeHtml(record.email || '—')}</dd>

          <dt style="color: var(--neutral-500);">Assigned Branch:</dt>
          <dd>${escapeHtml(record.branch || '—')}</dd>

          <dt style="color: var(--neutral-500);">Account Type:</dt>
          <dd style="text-transform: capitalize;">${escapeHtml(record.account_type || '—')}</dd>
        </dl>
      </div>
    `;

    const modal = new Modal({
      title: `Workbook Record — Row #${record.row_number}`,
      content,
      maxWidth: '560px',
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

    const listEl = this.container.querySelector('#event-log-list');
    const pillEl = this.container.querySelector('#sse-connection-pill');

    this.sseClient = new SseClient(this.uploadId);

    this.sseClient.onStateChange(state => {
      if (pillEl) {
        if (state === 'connected') {
          pillEl.className = 'badge badge-success';
          pillEl.textContent = 'Live Connected';
        } else if (state === 'connecting' || state === 'reconnecting') {
          pillEl.className = 'badge badge-validating';
          pillEl.textContent = state === 'reconnecting' ? 'Reconnecting' : 'Connecting';
        } else {
          pillEl.className = 'badge badge-danger';
          pillEl.textContent = 'Disconnected';
        }
      }
    });

    this.sseClient.onMessage((msg: SseEventMessage) => {
      if (listEl) {
        if (listEl.querySelector('div')?.style.fontStyle === 'italic') {
          listEl.innerHTML = '';
        }
        const item = document.createElement('div');
        item.className = 'event-log-item';
        item.innerHTML = `
          <span class="event-time">${new Date().toLocaleTimeString()}</span>
          <span class="event-type badge badge-${getEventBadgeClass(msg.event)}">${escapeHtml(msg.event)}</span>
          <span class="event-desc">${escapeHtml(formatEventPayload(msg.event, msg.payload))}</span>
        `;
        listEl.insertBefore(item, listEl.firstChild);
      }

      this.handleSseUpdate(msg);
    });

    this.sseClient.connect();
  }

  private handleSseUpdate(msg: SseEventMessage): void {
    if (!this.upload) return;

    if (msg.event === 'row_processed') {
      const p = msg.payload as { processed_rows?: number; valid_rows?: number; invalid_rows?: number; total_rows?: number; percent?: number };
      if (p.processed_rows !== undefined) this.upload.processed_rows = p.processed_rows;
      if (p.valid_rows !== undefined) this.upload.valid_rows = p.valid_rows;
      if (p.invalid_rows !== undefined) this.upload.invalid_rows = p.invalid_rows;
      if (p.percent !== undefined) this.upload.process_progress = p.percent;

      this.renderStats();
      this.updateBanners();
    } else if (msg.event === 'validation_completed') {
      this.loadBatch();
    } else if (msg.event === 'commit_completed') {
      this.loadBatch();
    } else if (msg.event === 'upload_status_changed') {
      const p = msg.payload as { status?: string };
      if (p.status) {
        this.upload.status = p.status as any;
        this.renderHeader();
        this.updateBanners();
      }
    }
  }

  public destroy(): void {
    if (this.sseClient) {
      this.sseClient.close();
      this.sseClient = null;
    }
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
