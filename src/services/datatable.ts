export interface DataTableColumn<T> {
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

export interface DataTableOptions<T> {
  tableId: string;
  columns: DataTableColumn<T>[];
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
  onSearch?: (query: string) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc', sortKey: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export class DataTable<T> {
  private options: DataTableOptions<T>;
  private container: HTMLElement;
  private tableWrapper: HTMLElement;
  private tableEl: HTMLTableElement;
  private theadEl: HTMLTableSectionElement;
  private tbodyEl: HTMLTableSectionElement;

  // Toolbar elements
  private toolbarEl: HTMLElement;
  private searchInput: HTMLInputElement | null = null;
  private searchClearBtn: HTMLButtonElement | null = null;
  private columnToggleBtn: HTMLButtonElement | null = null;
  private columnPopover: HTMLElement | null = null;
  private customFilterSlot: HTMLElement;
  private customActionsSlot: HTMLElement;

  // Pagination elements
  private paginationBar: HTMLElement;
  private pageInfoEl: HTMLElement;
  private pageControlsEl: HTMLElement;
  private pageSizeSelect: HTMLSelectElement | null = null;

  // State
  private hiddenColumnIds: Set<string> = new Set();
  private sortColumnId = '';
  private sortDirection: 'asc' | 'desc' = 'asc';
  private currentPage = 1;
  private pageSize = 20;
  private totalRows = 0;
  private data: T[] = [];
  private isLoading = false;
  private searchDebounceTimer: number | null = null;
  private documentClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: DataTableOptions<T>) {
    this.options = {
      enableSearch: true,
      enableColumnToggle: true,
      enablePagination: true,
      pageSizeOptions: [10, 20, 50, 100],
      searchPlaceholder: 'Search records...',
      emptyTitle: 'No records found',
      emptyMessage: 'No records matched your search or filters.',
      ...options
    };

    this.currentPage = options.page || 1;
    this.pageSize = options.pageSize || 20;
    this.totalRows = options.totalRows || 0;
    this.data = options.data || [];

    if (options.initialSort) {
      this.sortColumnId = options.initialSort.columnId;
      this.sortDirection = options.initialSort.direction;
    }

    this.loadColumnPreferences();

    this.container = document.createElement('div');
    this.container.className = 'datatable-container';

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'toolbar datatable-toolbar';

    this.customFilterSlot = document.createElement('div');
    this.customFilterSlot.className = 'datatable-filter-slot';

    this.customActionsSlot = document.createElement('div');
    this.customActionsSlot.className = 'datatable-actions-slot';

    this.tableWrapper = document.createElement('div');
    this.tableWrapper.className = 'table-responsive';

    this.tableEl = document.createElement('table');
    this.tableEl.className = 'data-table';

    this.theadEl = document.createElement('thead');
    this.tbodyEl = document.createElement('tbody');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableWrapper.appendChild(this.tableEl);

    this.paginationBar = document.createElement('div');
    this.paginationBar.className = 'pagination-bar datatable-pagination';
    this.pageInfoEl = document.createElement('div');
    this.pageControlsEl = document.createElement('div');
    this.pageControlsEl.className = 'pagination-controls';

    this.buildToolbar();
    this.buildPagination();
    this.renderHeader();
    this.renderBody();

    this.container.appendChild(this.toolbarEl);
    this.container.appendChild(this.tableWrapper);
    if (this.options.enablePagination) {
      this.container.appendChild(this.paginationBar);
    }

    this.bindDocumentEvents();
  }

  private loadColumnPreferences(): void {
    this.options.columns.forEach(c => {
      if (c.hidden) {
        this.hiddenColumnIds.add(c.id);
      }
    });

    try {
      const saved = localStorage.getItem(`dt_cols_${this.options.tableId}`);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          this.hiddenColumnIds = new Set(arr);
        }
      }
    } catch {
      // ignore
    }
  }

  private saveColumnPreferences(): void {
    try {
      localStorage.setItem(
        `dt_cols_${this.options.tableId}`,
        JSON.stringify(Array.from(this.hiddenColumnIds))
      );
    } catch {
      // ignore
    }
  }

  private buildToolbar(): void {
    this.toolbarEl.innerHTML = '';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar-group';

    if (this.options.enableSearch) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'search-input-wrapper datatable-search-wrapper';

      const searchIcon = document.createElement('span');
      searchIcon.className = 'search-icon';
      searchIcon.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';

      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.className = 'search-input';
      this.searchInput.placeholder = this.options.searchPlaceholder || 'Search records...';
      this.searchInput.setAttribute('aria-label', this.options.searchPlaceholder || 'Search records');

      this.searchClearBtn = document.createElement('button');
      this.searchClearBtn.type = 'button';
      this.searchClearBtn.className = 'search-clear-btn';
      this.searchClearBtn.innerHTML = '&times;';
      this.searchClearBtn.title = 'Clear search';
      this.searchClearBtn.style.display = 'none';

      this.searchInput.addEventListener('input', () => {
        const val = this.searchInput?.value.trim() || '';
        this.searchClearBtn!.style.display = val ? 'block' : 'none';

        if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = window.setTimeout(() => {
          this.currentPage = 1;
          if (this.options.onSearch) {
            this.options.onSearch(val);
          }
        }, 280);
      });

      this.searchClearBtn.addEventListener('click', () => {
        if (this.searchInput) {
          this.searchInput.value = '';
          this.searchClearBtn!.style.display = 'none';
          this.currentPage = 1;
          if (this.options.onSearch) {
            this.options.onSearch('');
          }
          this.searchInput.focus();
        }
      });

      searchWrap.appendChild(searchIcon);
      searchWrap.appendChild(this.searchInput);
      searchWrap.appendChild(this.searchClearBtn);
      leftGroup.appendChild(searchWrap);
    }

    leftGroup.appendChild(this.customFilterSlot);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group';
    rightGroup.appendChild(this.customActionsSlot);

    if (this.options.enableColumnToggle) {
      const colWrap = document.createElement('div');
      colWrap.className = 'column-toggle-wrapper';
      colWrap.style.position = 'relative';

      this.columnToggleBtn = document.createElement('button');
      this.columnToggleBtn.type = 'button';
      this.columnToggleBtn.className = 'btn btn-secondary btn-sm column-toggle-btn';
      this.updateColumnToggleBtnText();

      this.columnPopover = document.createElement('div');
      this.columnPopover.className = 'column-toggle-popover';
      this.columnPopover.style.display = 'none';

      this.renderColumnPopover();

      this.columnToggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = this.columnPopover!.style.display === 'block';
        this.columnPopover!.style.display = isOpen ? 'none' : 'block';
      });

      colWrap.appendChild(this.columnToggleBtn);
      colWrap.appendChild(this.columnPopover);
      rightGroup.appendChild(colWrap);
    }

    this.toolbarEl.appendChild(leftGroup);
    this.toolbarEl.appendChild(rightGroup);
  }

  private updateColumnToggleBtnText(): void {
    if (!this.columnToggleBtn) return;
    const hideableCols = this.options.columns.filter(c => c.hideable !== false);
    const visibleCount = hideableCols.filter(c => !this.hiddenColumnIds.has(c.id)).length;
    this.columnToggleBtn.innerHTML = `<i class="fa-solid fa-table-columns"></i> Columns (${visibleCount}/${hideableCols.length})`;
  }

  private renderColumnPopover(): void {
    if (!this.columnPopover) return;
    this.columnPopover.innerHTML = `
      <div class="col-popover-header">
        <span style="font-weight: 700; font-size: 0.8rem; color: var(--neutral-700);">Toggle Columns</span>
        <button type="button" class="btn-text-sm" id="btn-col-reset" style="font-size: 0.75rem; color: var(--primary); cursor: pointer; background: none; border: none;">Reset</button>
      </div>
      <div class="col-popover-list" id="col-popover-items"></div>
    `;

    const listEl = this.columnPopover.querySelector('#col-popover-items')!;
    this.options.columns.forEach(col => {
      if (col.hideable === false) return;

      const item = document.createElement('label');
      item.className = 'col-popover-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !this.hiddenColumnIds.has(col.id);
      checkbox.dataset.colId = col.id;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.hiddenColumnIds.delete(col.id);
        } else {
          const hideable = this.options.columns.filter(c => c.hideable !== false);
          const remainingVisible = hideable.filter(c => !this.hiddenColumnIds.has(c.id) && c.id !== col.id);
          if (remainingVisible.length === 0) {
            checkbox.checked = true;
            return;
          }
          this.hiddenColumnIds.add(col.id);
        }
        this.saveColumnPreferences();
        this.updateColumnToggleBtnText();
        this.renderHeader();
        this.renderBody();
      });

      const span = document.createElement('span');
      span.textContent = col.header;

      item.appendChild(checkbox);
      item.appendChild(span);
      listEl.appendChild(item);
    });

    this.columnPopover.querySelector('#btn-col-reset')?.addEventListener('click', () => {
      this.hiddenColumnIds.clear();
      this.options.columns.forEach(c => {
        if (c.hidden) this.hiddenColumnIds.add(c.id);
      });
      this.saveColumnPreferences();
      this.updateColumnToggleBtnText();
      this.renderColumnPopover();
      this.renderHeader();
      this.renderBody();
    });
  }

  private bindDocumentEvents(): void {
    this.documentClickHandler = (e: MouseEvent) => {
      if (this.columnPopover && this.columnPopover.style.display === 'block') {
        const target = e.target as HTMLElement;
        if (!this.columnPopover.contains(target) && target !== this.columnToggleBtn) {
          this.columnPopover.style.display = 'none';
        }
      }
    };
    document.addEventListener('click', this.documentClickHandler);
  }

  private getVisibleColumns(): DataTableColumn<T>[] {
    return this.options.columns.filter(c => !this.hiddenColumnIds.has(c.id));
  }

  private renderHeader(): void {
    this.theadEl.innerHTML = '';
    const tr = document.createElement('tr');

    const visibleColumns = this.getVisibleColumns();
    visibleColumns.forEach(col => {
      const th = document.createElement('th');
      if (col.width) th.style.width = col.width;
      if (col.align) th.style.textAlign = col.align;

      const inner = document.createElement('div');
      inner.className = 'th-inner';
      if (col.sortable) {
        th.classList.add('sortable');
        th.setAttribute('tabindex', '0');
        th.setAttribute('role', 'button');
        th.setAttribute('aria-label', `Sort by ${col.header}`);

        const label = document.createElement('span');
        label.textContent = col.header;

        const sortIcon = document.createElement('span');
        sortIcon.className = 'sort-indicator';

        if (this.sortColumnId === col.id) {
          th.classList.add('sorted', this.sortDirection);
          sortIcon.textContent = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
          sortIcon.textContent = ' ↕';
        }

        inner.appendChild(label);
        inner.appendChild(sortIcon);

        const handleSort = () => {
          if (this.sortColumnId === col.id) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            this.sortColumnId = col.id;
            this.sortDirection = 'asc';
          }

          const sortKey = col.sortKey || col.id;
          if (this.options.onSort) {
            this.options.onSort(col.id, this.sortDirection, sortKey);
          }
          this.renderHeader();
        };

        th.addEventListener('click', handleSort);
        th.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort();
          }
        });
      } else {
        inner.textContent = col.header;
      }

      th.appendChild(inner);
      tr.appendChild(th);
    });

    this.theadEl.appendChild(tr);
  }

  public renderBody(): void {
    this.tbodyEl.innerHTML = '';
    const visibleColumns = this.getVisibleColumns();

    if (this.isLoading) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = visibleColumns.length;
      td.style.textAlign = 'center';
      td.style.padding = '3rem 1rem';
      td.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--neutral-500);">
          <span style="font-size: 1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i></span>
          <span style="font-weight: 600;">Loading data...</span>
        </div>
      `;
      tr.appendChild(td);
      this.tbodyEl.appendChild(tr);
      return;
    }

    if (this.data.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = visibleColumns.length;
      td.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-icon" style="font-size: 2.2rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></div>
          <div class="empty-title" style="font-size: 1.05rem;">${escapeHtml(this.options.emptyTitle || 'No records found')}</div>
          <div class="empty-description" style="font-size: 0.85rem; max-width: 360px;">${escapeHtml(this.options.emptyMessage || 'No matching entries found.')}</div>
        </div>
      `;
      tr.appendChild(td);
      this.tbodyEl.appendChild(tr);
      return;
    }

    this.data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      if (this.options.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => this.options.onRowClick!(row, rowIndex));
      }

      visibleColumns.forEach(col => {
        const td = document.createElement('td');
        if (col.align) td.style.textAlign = col.align;
        if (col.className) td.className = col.className;

        if (col.render) {
          const rendered = col.render(row, rowIndex);
          if (typeof rendered === 'string') {
            td.innerHTML = rendered;
          } else {
            td.appendChild(rendered);
          }
        } else if (col.accessor) {
          let val: unknown;
          if (typeof col.accessor === 'function') {
            val = col.accessor(row);
          } else {
            val = row[col.accessor];
          }
          td.textContent = val !== null && val !== undefined ? String(val) : '—';
        }

        tr.appendChild(td);
      });

      this.tbodyEl.appendChild(tr);
    });

    this.updatePagination();
  }

  private buildPagination(): void {
    this.paginationBar.innerHTML = '';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '1rem';
    left.style.flexWrap = 'wrap';

    left.appendChild(this.pageInfoEl);

    if (this.options.pageSizeOptions && this.options.pageSizeOptions.length > 1) {
      const sizeWrap = document.createElement('div');
      sizeWrap.style.display = 'flex';
      sizeWrap.style.alignItems = 'center';
      sizeWrap.style.gap = '0.35rem';
      sizeWrap.style.fontSize = '0.8rem';
      sizeWrap.style.color = 'var(--neutral-600)';

      const label = document.createElement('span');
      label.textContent = 'Rows per page:';

      this.pageSizeSelect = document.createElement('select');
      this.pageSizeSelect.className = 'filter-select';
      this.pageSizeSelect.style.padding = '0.25rem 1.5rem 0.25rem 0.5rem';
      this.pageSizeSelect.style.fontSize = '0.8rem';

      this.options.pageSizeOptions.forEach(opt => {
        const o = document.createElement('option');
        o.value = String(opt);
        o.textContent = String(opt);
        if (opt === this.pageSize) o.selected = true;
        this.pageSizeSelect!.appendChild(o);
      });

      this.pageSizeSelect.addEventListener('change', () => {
        this.pageSize = parseInt(this.pageSizeSelect!.value, 10);
        this.currentPage = 1;
        if (this.options.onPageSizeChange) {
          this.options.onPageSizeChange(this.pageSize);
        }
      });

      sizeWrap.appendChild(label);
      sizeWrap.appendChild(this.pageSizeSelect);
      left.appendChild(sizeWrap);
    }

    this.paginationBar.appendChild(left);
    this.paginationBar.appendChild(this.pageControlsEl);
  }

  private updatePagination(): void {
    if (!this.options.enablePagination) return;

    const totalPages = Math.max(1, Math.ceil(this.totalRows / this.pageSize));
    const start = this.totalRows === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalRows);

    this.pageInfoEl.textContent = `Showing ${start} to ${end} of ${this.totalRows} entries`;
    this.pageControlsEl.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '‹ Prev';
    prevBtn.disabled = this.currentPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        if (this.options.onPageChange) {
          this.options.onPageChange(this.currentPage);
        }
      }
    });
    this.pageControlsEl.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= this.currentPage - 2 && p <= this.currentPage + 2)) {
        const pBtn = document.createElement('button');
        pBtn.className = `page-btn ${p === this.currentPage ? 'active' : ''}`;
        pBtn.textContent = String(p);
        pBtn.addEventListener('click', () => {
          this.currentPage = p;
          if (this.options.onPageChange) {
            this.options.onPageChange(p);
          }
        });
        this.pageControlsEl.appendChild(pBtn);
      }
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next ›';
    nextBtn.disabled = this.currentPage >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        if (this.options.onPageChange) {
          this.options.onPageChange(this.currentPage);
        }
      }
    });
    this.pageControlsEl.appendChild(nextBtn);
  }

  // Public API methods
  public setData(data: T[], totalRows?: number, page?: number): void {
    this.data = data;
    if (totalRows !== undefined) this.totalRows = totalRows;
    if (page !== undefined) this.currentPage = page;
    this.isLoading = false;
    this.renderBody();
  }

  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.renderBody();
  }

  public setError(message: string): void {
    this.tbodyEl.innerHTML = `
      <tr>
        <td colspan="${this.getVisibleColumns().length}" style="text-align: center; padding: 2.5rem; color: var(--danger);">
          <div style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Records</div>
          <div style="font-size: 0.85rem;">${escapeHtml(message)}</div>
        </td>
      </tr>
    `;
  }

  public setCustomFilterSlot(el: HTMLElement): void {
    this.customFilterSlot.innerHTML = '';
    this.customFilterSlot.appendChild(el);
  }

  public addCustomAction(btn: HTMLElement): void {
    this.customActionsSlot.appendChild(btn);
  }

  public getSearchValue(): string {
    return this.searchInput?.value.trim() || '';
  }

  public setSearchValue(val: string): void {
    if (this.searchInput) {
      this.searchInput.value = val;
      if (this.searchClearBtn) {
        this.searchClearBtn.style.display = val ? 'block' : 'none';
      }
    }
  }

  public getData(): T[] {
    return this.data;
  }

  public getTotalRows(): number {
    return this.totalRows;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }
}

// Aliases for compatibility
export { DataTable as DataTableComponent };
export type { DataTableColumn as DataTableColumnDef };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
