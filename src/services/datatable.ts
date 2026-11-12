/**
 * DataTableComponent — wrapper around DataTables 3.1.3 (window.DataTable).
 *
 * Loaded via <script src="/DataTables/datatables.min.js"> in index.html
 * before the TypeScript module bundle runs, so window.DataTable is available.
 *
 * Public API matches the old src/components/data-table.ts exactly so view
 * files only need their import path updated.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare const DataTable: any; // set by datatables.min.js global IIFE

// ─────────────────────────────────────────────────────────────────────────────
// Column & options types  (same shape as the old data-table.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableColumnDef<T> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => unknown);
  render?: (row: T, index: number) => HTMLElement | string;
  sortable?: boolean;
  sortKey?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hidden?: boolean;
  hideable?: boolean;
  className?: string;
}

export interface DataTableComponentOptions<T> {
  tableId: string;
  columns: DataTableColumnDef<T>[];
  data?: T[];
  totalRows?: number;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
  enableColumnToggle?: boolean;
  enablePagination?: boolean;
  initialSort?: { columnId: string; direction: 'asc' | 'desc' };
  /** Server-side search callback — called on debounced input */
  onSearch?: (query: string) => void;
  /** Server-side sort callback */
  onSort?: (columnId: string, direction: 'asc' | 'desc', sortKey: string) => void;
  /** Server-side page callback */
  onPageChange?: (page: number) => void;
  /** Server-side page-size callback */
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DataTableComponent
// ─────────────────────────────────────────────────────────────────────────────

export class DataTableComponent<T extends object> {
  private opts: Required<DataTableComponentOptions<T>>;

  // DOM
  private wrapper: HTMLElement;           // outermost div returned by getElement()
  private toolbarEl: HTMLElement;
  private customFilterSlot: HTMLElement;
  private customActionsSlot: HTMLElement;
  private tableEl: HTMLTableElement;

  // DataTables instance
  private dt: any = null;

  // State
  private data: T[] = [];
  private totalRows = 0;
  private isLoading = false;
  private loadingRow: HTMLElement | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private hiddenColumnIds: Set<string> = new Set();

  constructor(options: DataTableComponentOptions<T>) {
    this.opts = {
      enableSearch: true,
      enableColumnToggle: true,
      enablePagination: true,
      pageSizeOptions: [10, 20, 50, 100],
      searchPlaceholder: 'Search records...',
      emptyTitle: 'No records found',
      emptyMessage: 'No records matched your search or filters.',
      data: [],
      totalRows: 0,
      page: 1,
      pageSize: 20,
      onSearch: undefined as any,
      onSort: undefined as any,
      onPageChange: undefined as any,
      onPageSizeChange: undefined as any,
      onRowClick: undefined as any,
      initialSort: undefined as any,
      accessor: undefined as any,
      ...options,
    } as unknown as Required<DataTableComponentOptions<T>>;

    this.data = options.data || [];
    this.totalRows = options.totalRows || 0;

    // Load saved hidden columns from localStorage
    this.loadColumnPrefs();

    // Build outer wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'datatable-container';

    // Toolbar (search + filter slot + actions + column toggle)
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'toolbar datatable-toolbar';

    this.customFilterSlot = document.createElement('div');
    this.customFilterSlot.className = 'datatable-filter-slot';

    this.customActionsSlot = document.createElement('div');
    this.customActionsSlot.className = 'datatable-actions-slot';

    this.buildToolbar();

    // Table element (DataTables will enhance it)
    this.tableEl = document.createElement('table');
    this.tableEl.id = `dt-${options.tableId}`;
    this.tableEl.className = 'data-table display nowrap';
    this.tableEl.style.width = '100%';

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    tableWrapper.appendChild(this.tableEl);

    this.wrapper.appendChild(this.toolbarEl);
    this.wrapper.appendChild(tableWrapper);

    // Initialise DataTables after the element is in a document fragment
    // We defer via requestAnimationFrame so callers can append wrapper first.
    // But views append to DOM immediately, so init inline is safer.
    this.initDataTable();
  }

  // ── Private: localStorage column prefs ──────────────────────────────────

  private loadColumnPrefs(): void {
    this.opts.columns.forEach(c => { if (c.hidden) this.hiddenColumnIds.add(c.id); });
    try {
      const saved = localStorage.getItem(`dt_cols_${this.opts.tableId}`);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) this.hiddenColumnIds = new Set(arr);
      }
    } catch { /* ignore */ }
  }

  private saveColumnPrefs(): void {
    try {
      localStorage.setItem(`dt_cols_${this.opts.tableId}`, JSON.stringify([...this.hiddenColumnIds]));
    } catch { /* ignore */ }
  }

  // ── Private: toolbar ────────────────────────────────────────────────────

  private buildToolbar(): void {
    this.toolbarEl.innerHTML = '';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar-group';

    // Search
    if (this.opts.enableSearch && this.opts.onSearch) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'search-input-wrapper datatable-search-wrapper';

      const icon = document.createElement('span');
      icon.className = 'search-icon';
      icon.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'search-input';
      input.placeholder = this.opts.searchPlaceholder;
      input.setAttribute('aria-label', this.opts.searchPlaceholder);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'search-clear-btn';
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Clear search';
      clearBtn.style.display = 'none';

      input.addEventListener('input', () => {
        const val = input.value.trim();
        clearBtn.style.display = val ? 'block' : 'none';
        if (this.searchDebounce) clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
          // If DataTables is initialised pass search through it; otherwise callback directly
          if (this.dt) {
            this.dt.search(val).draw();
          } else if (this.opts.onSearch) {
            this.opts.onSearch(val);
          }
        }, 280);
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        if (this.dt) {
          this.dt.search('').draw();
        } else if (this.opts.onSearch) {
          this.opts.onSearch('');
        }
        input.focus();
      });

      searchWrap.appendChild(icon);
      searchWrap.appendChild(input);
      searchWrap.appendChild(clearBtn);
      leftGroup.appendChild(searchWrap);
    }

    leftGroup.appendChild(this.customFilterSlot);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group';
    rightGroup.appendChild(this.customActionsSlot);

    // Column toggle
    if (this.opts.enableColumnToggle) {
      const colWrap = document.createElement('div');
      colWrap.className = 'column-toggle-wrapper';
      colWrap.style.position = 'relative';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn btn-secondary btn-sm column-toggle-btn';
      this.updateColToggleBtnLabel(toggleBtn);

      const popover = document.createElement('div');
      popover.className = 'column-toggle-popover';
      popover.style.display = 'none';
      this.renderColPopover(popover, toggleBtn);

      toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        popover.style.display = popover.style.display === 'block' ? 'none' : 'block';
      });

      document.addEventListener('click', e => {
        if (popover.style.display === 'block') {
          if (!popover.contains(e.target as Node) && e.target !== toggleBtn) {
            popover.style.display = 'none';
          }
        }
      });

      colWrap.appendChild(toggleBtn);
      colWrap.appendChild(popover);
      rightGroup.appendChild(colWrap);
    }

    this.toolbarEl.appendChild(leftGroup);
    this.toolbarEl.appendChild(rightGroup);
  }

  private updateColToggleBtnLabel(btn: HTMLButtonElement): void {
    const hideable = this.opts.columns.filter(c => c.hideable !== false);
    const visible = hideable.filter(c => !this.hiddenColumnIds.has(c.id)).length;
    btn.innerHTML = `<i class="fa-solid fa-table-columns"></i> Columns (${visible}/${hideable.length})`;
  }

  private renderColPopover(popover: HTMLElement, toggleBtn: HTMLButtonElement): void {
    popover.innerHTML = `
      <div class="col-popover-header">
        <span style="font-weight:700;font-size:0.8rem;color:var(--neutral-700);">Toggle Columns</span>
        <button type="button" class="btn-text-sm" id="btn-col-reset-${this.opts.tableId}" style="font-size:0.75rem;color:var(--primary);cursor:pointer;background:none;border:none;">Reset</button>
      </div>
      <div class="col-popover-list" id="col-list-${this.opts.tableId}"></div>
    `;

    const listEl = popover.querySelector(`#col-list-${this.opts.tableId}`)!;
    this.opts.columns.forEach((col, colIdx) => {
      if (col.hideable === false) return;
      const item = document.createElement('label');
      item.className = 'col-popover-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !this.hiddenColumnIds.has(col.id);

      cb.addEventListener('change', () => {
        if (cb.checked) {
          this.hiddenColumnIds.delete(col.id);
        } else {
          const hideable = this.opts.columns.filter(c => c.hideable !== false);
          const remaining = hideable.filter(c => !this.hiddenColumnIds.has(c.id) && c.id !== col.id);
          if (remaining.length === 0) { cb.checked = true; return; }
          this.hiddenColumnIds.add(col.id);
        }
        this.saveColumnPrefs();
        this.updateColToggleBtnLabel(toggleBtn);
        // Toggle DataTables column visibility
        if (this.dt) {
          this.dt.column(colIdx).visible(!this.hiddenColumnIds.has(col.id));
        }
      });

      const span = document.createElement('span');
      span.textContent = col.header;
      item.appendChild(cb);
      item.appendChild(span);
      listEl.appendChild(item);
    });

    popover.querySelector(`#btn-col-reset-${this.opts.tableId}`)?.addEventListener('click', () => {
      this.hiddenColumnIds.clear();
      this.opts.columns.forEach(c => { if (c.hidden) this.hiddenColumnIds.add(c.id); });
      this.saveColumnPrefs();
      this.updateColToggleBtnLabel(toggleBtn);
      this.renderColPopover(popover, toggleBtn);
      if (this.dt) {
        this.opts.columns.forEach((col, idx) => {
          this.dt.column(idx).visible(!this.hiddenColumnIds.has(col.id));
        });
      }
    });
  }

  // ── Private: DataTables init ────────────────────────────────────────────

  private initDataTable(): void {
    if (typeof DataTable === 'undefined') {
      console.error('[DataTableComponent] window.DataTable not found. Ensure datatables.min.js is loaded before the app bundle.');
      return;
    }

    const cols = this.opts.columns.map((col, _idx) => ({
      title: col.header,
      width: col.width || undefined,
      className: [col.className || '', col.align ? `text-${col.align}` : ''].filter(Boolean).join(' ') || undefined,
      visible: !this.hiddenColumnIds.has(col.id),
      orderable: !!col.sortable,
      render: (data: unknown, type: string, row: T, meta: { row: number }) => {
        if (type !== 'display') return data !== null && data !== undefined ? String(data) : '';
        if (col.render) {
          const rendered = col.render(row, meta.row);
          if (rendered instanceof HTMLElement) return rendered.outerHTML;
          return rendered as string;
        }
        if (col.accessor) {
          const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
          return val !== null && val !== undefined ? escapeHtml(String(val)) : '—';
        }
        return data !== null && data !== undefined ? escapeHtml(String(data)) : '—';
      },
      data: null as unknown, // we pass full row objects; use render for display
    }));

    const pageLength = this.opts.pageSize || 20;
    const pageLengthMenu = this.opts.pageSizeOptions?.length ? this.opts.pageSizeOptions : [10, 20, 50, 100];

    const dtOptions: any = {
      data: this.data,
      columns: cols,
      pageLength,
      lengthMenu: pageLengthMenu,
      searching: !!this.opts.enableSearch && !this.opts.onSearch, // let DataTables handle search only when no server-side callback
      paging: !!this.opts.enablePagination,
      ordering: true,
      info: !!this.opts.enablePagination,
      dom: this.opts.enablePagination
        ? '<"datatable-info-wrap"i><"datatable-length-wrap"l>t<"datatable-pages-wrap"p>'
        : 't',
      language: {
        search: '',
        searchPlaceholder: this.opts.searchPlaceholder,
        emptyTable: this.buildEmptyHtml(),
        zeroRecords: this.buildEmptyHtml(),
        infoEmpty: 'Showing 0 to 0 of 0 entries',
        info: 'Showing _START_ to _END_ of _TOTAL_ entries',
        lengthMenu: 'Rows per page: _MENU_',
        paginate: {
          previous: '‹ Prev',
          next: 'Next ›',
        },
      },
      createdRow: (row: HTMLElement, _data: T, dataIndex: number) => {
        if (this.opts.onRowClick) {
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => {
            const rowData = this.dt.row(row).data() as T;
            this.opts.onRowClick!(rowData, dataIndex);
          });
        }
      },
    };

    // Set initial sort
    if (this.opts.initialSort) {
      const sortColIdx = this.opts.columns.findIndex(c => c.id === this.opts.initialSort.columnId);
      if (sortColIdx >= 0) {
        dtOptions.order = [[sortColIdx, this.opts.initialSort.direction]];
      }
    }

    this.dt = new DataTable(this.tableEl, dtOptions);

    // Server-side callbacks wired through DataTables events
    if (this.opts.onSort) {
      this.dt.on('order.dt', () => {
        const order = this.dt.order();
        if (order && order.length > 0) {
          const [colIdx, dir] = order[0] as [number, string];
          const col = this.opts.columns[colIdx];
          if (col && this.opts.onSort) {
            this.opts.onSort(col.id, dir as 'asc' | 'desc', col.sortKey || col.id);
          }
        }
      });
    }

    if (this.opts.onPageChange) {
      this.dt.on('page.dt', () => {
        const info = this.dt.page.info();
        if (this.opts.onPageChange) this.opts.onPageChange(info.page + 1);
      });
    }

    if (this.opts.onPageSizeChange) {
      this.dt.on('length.dt', (_e: Event, _settings: any, len: number) => {
        if (this.opts.onPageSizeChange) this.opts.onPageSizeChange(len);
      });
    }

    if (this.opts.onSearch) {
      this.dt.on('search.dt', () => {
        const val = this.dt.search();
        if (this.opts.onSearch) this.opts.onSearch(val);
      });
    }
  }

  private buildEmptyHtml(): string {
    return `<div class="empty-state" style="padding:2.5rem 1rem;text-align:center;">
      <div class="empty-icon" style="font-size:2.2rem;margin-bottom:0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></div>
      <div class="empty-title" style="font-size:1.05rem;">${escapeHtml(this.opts.emptyTitle)}</div>
      <div class="empty-description" style="font-size:0.85rem;max-width:360px;margin:0 auto;">${escapeHtml(this.opts.emptyMessage)}</div>
    </div>`;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Replace data in the table (mirrors old data-table.ts signature). */
  public setData(data: T[], totalRows?: number, _page?: number): void {
    this.data = data;
    if (totalRows !== undefined) this.totalRows = totalRows;
    this.isLoading = false;
    if (this.loadingRow) {
      this.loadingRow.remove();
      this.loadingRow = null;
    }
    if (this.dt) {
      this.dt.clear();
      this.dt.rows.add(data);
      this.dt.draw(false);
    }
  }

  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    if (!this.dt) return;

    if (loading) {
      this.dt.clear().draw(false);
      const tbody = this.tableEl.querySelector('tbody');
      if (tbody) {
        const colCount = this.opts.columns.filter(c => !this.hiddenColumnIds.has(c.id)).length;
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = colCount;
        td.style.textAlign = 'center';
        td.style.padding = '3rem 1rem';
        td.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;color:var(--neutral-500);">
          <span style="font-size:1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i></span>
          <span style="font-weight:600;">Loading data...</span>
        </div>`;
        tr.appendChild(td);
        this.loadingRow = tr;
        tbody.insertBefore(tr, tbody.firstChild);
      }
    } else {
      if (this.loadingRow) {
        this.loadingRow.remove();
        this.loadingRow = null;
      }
    }
  }

  public setError(message: string): void {
    if (!this.dt) return;
    this.dt.clear().draw(false);
    const tbody = this.tableEl.querySelector('tbody');
    if (tbody) {
      const colCount = this.opts.columns.filter(c => !this.hiddenColumnIds.has(c.id)).length;
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = colCount;
      td.style.textAlign = 'center';
      td.style.padding = '2.5rem 1rem';
      td.innerHTML = `<div style="color:var(--danger);">
        <div style="font-weight:700;margin-bottom:0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Records</div>
        <div style="font-size:0.85rem;">${escapeHtml(message)}</div>
      </div>`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  public setCustomFilterSlot(el: HTMLElement): void {
    this.customFilterSlot.innerHTML = '';
    this.customFilterSlot.appendChild(el);
  }

  public addCustomAction(btn: HTMLElement): void {
    this.customActionsSlot.appendChild(btn);
  }

  public getSearchValue(): string {
    return this.dt ? (this.dt.search() as string) : '';
  }

  public setSearchValue(val: string): void {
    if (this.dt) this.dt.search(val).draw();
  }

  public getElement(): HTMLElement {
    return this.wrapper;
  }

  public destroy(): void {
    if (this.dt) {
      this.dt.destroy(true); // true = remove table from DOM as well
      this.dt = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy type aliases so old "DataTable / DataTableColumn" imports still work
// (views that haven't been updated yet)
// ─────────────────────────────────────────────────────────────────────────────
export { DataTableComponent as DataTable };
export type { DataTableColumnDef as DataTableColumn };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

