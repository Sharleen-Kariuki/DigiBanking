import { ApiClient } from '../services/api-client';
import { Member, PaginatedResponse } from '../types';
import { ToastManager } from '../components/toast';
import { Modal } from '../components/modal';

export class MembersView {
  private container: HTMLElement;
  private dt: any = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'members-view';
  }

  public async render(): Promise<HTMLElement> {
    this.container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900);">Onboarded Members Directory</h2>
        <p style="color: var(--neutral-500); font-size: 0.9rem; margin-top: 0.2rem;">
          Bank members who have been successfully reviewed and activated in digital banking.
        </p>
      </div>
  
      <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-members">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
      </button>
    </div>
  
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Active Digital Banking Members</h3>
          <p class="card-subtitle">Search by name, ID, phone, or member number; sort and inspect accounts</p>
        </div>
      </div>
  
      <!-- Inline Search -->
      <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; padding: 0 1rem;">
        <select id="column-select" style="padding: 0.5rem; border: 1px solid var(--neutral-300); border-radius: 4px;">
          <option value="0">Member #</option>
          <option value="1">First Name</option>
          <option value="2">Last Name</option>
          <option value="3">National ID</option>
          <option value="4">Phone Number</option>
          <option value="5">Branch</option>
          <option value="6">Account Type</option>
          <option value="7">Account Number</option>
          <option value="8">Onboarded At</option>
        </select>
        <select id="operand-select" style="padding: 0.5rem; border: 1px solid var(--neutral-300); border-radius: 4px;">
          <option value="contains">Contains</option>
          <option value="equals">Equals</option>
        </select>
        <input type="text" id="search-value" placeholder="Enter value" style="padding: 0.5rem; border: 1px solid var(--neutral-300); border-radius: 4px; width: 200px;" />
        <button id="apply-search" style="padding: 0.5rem 1rem; background-color: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Search
        </button>
      </div>
  
      <div class="card-body" id="table-slot" style="padding-top: 1rem;">
        <div id="members-table-loading" style="text-align: center; padding: 3rem 1rem; color: var(--neutral-500);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
          <span>Loading members...</span>
        </div>
        <table id="members-table" class="display wrap dataTable" style="width: 100%; display: none;"></table>
      </div>
    </div>
  `;
  
  // Add event listener for the inline search
  this.container.querySelector('#apply-search')?.addEventListener('click', () => {
    const column = (this.container.querySelector('#column-select') as HTMLSelectElement).value;
    const operand = (this.container.querySelector('#operand-select') as HTMLSelectElement).value;
    const value = (this.container.querySelector('#search-value') as HTMLInputElement).value;
  
    if (this.dt) {
      // Apply the search logic
      this.dt.column(parseInt(column)).search(operand === 'contains' ? value : `^${value}$`, true, false).draw();
    }
  });
    this.container.querySelector('#btn-refresh-members')?.addEventListener('click', () => {
      this.loadMembers();
    });

    // Mount UI immediately and load data asynchronously so router never hangs
    void this.loadMembers();
    return this.container;
  }

  public async loadMembers(): Promise<void> {
    const loadingEl = this.container.querySelector<HTMLElement>('#members-table-loading');
    const tableEl = this.container.querySelector<HTMLTableElement>('#members-table');
    if (!this.dt && loadingEl) loadingEl.style.display = 'block';

    try {
      const response: PaginatedResponse<Member> = await ApiClient.listMembers({
        limit: 100,
        $orderby: 'created_at desc',
        $count: true
      });

      if (loadingEl) loadingEl.style.display = 'none';
      if (tableEl) tableEl.style.display = 'table';

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
            <div style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Members</div>
            <div style="font-size: 0.85rem;">${escapeHtml(err instanceof Error ? err.message : String(err))}</div>
          </div>
        `;
      }
    }
  }

  private initDataTable(tableEl: HTMLTableElement, data: Member[]): void {
    if (typeof DataTable === 'undefined') {
      setTimeout(() => this.initDataTable(tableEl, data), 100);
      return;
    }
  
    // Initialize DataTable
    this.dt = new DataTable(tableEl, {
      data,
      pageLength: 20,
      lengthMenu: [10, 20, 50, 100],
      order: [[7, 'desc']],
      responsive: true,
      scrollY: '600px',
   // Add inline search

      columns: [
        {
          title: 'Member #',
          data: 'member_number',
          width: '140px',
          className: 'cell-mono cell-bold',
          render: (val: string) => `<span style="color: var(--primary);">${escapeHtml(val)}</span>`
        },
        {
          title: 'First Name',
          data: 'first_name',
          className: 'cell-bold',
        },
        {
          title: 'Last Name',
          data: 'last_name',
          className: 'cell-bold',
        },
        {
          title: 'National ID',
          data: 'id_number',
          className: 'cell-mono',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'Phone Number',
          data: 'phone_number',
          className: 'cell-mono',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'Branch',
          data: 'branch'
        },
        {
          title: 'Account Type',
          data: 'account_type',
          render: (val: string) => `<span style="text-transform: capitalize;">${escapeHtml(val || '—')}</span>`
        },
        {
          title: 'Account Number',
          data: 'account_number',
          className: 'cell-mono',
          render: (val: string) => escapeHtml(val || '—')
        },
        {
          title: 'Onboarded At',
          data: 'created_at',
          width: '150px',
          className: 'cell-mono',
          render: (val: string) => `<span style="font-size: 0.8rem; color: var(--neutral-600);">${formatDate(val)}</span>`
        },
        {
          title: 'Action',
          data: null,
          orderable: false,
          searchable: false,
          width: '90px',
          className: 'text-right',
          render: () => `<button type="button" class="btn btn-secondary btn-sm btn-view-member">View</button>`
        }
      ],
      language: {
        search: '_INPUT_',
        searchPlaceholder: 'Search by member #, name, phone, or ID...',
        emptyTable: 'No onboarded members found',
        zeroRecords: 'No members matched your search criteria.'
      }
    });
   

    // Move pagination to the right
const paginateEl = tableEl.parentElement?.querySelector('.dataTables_paginate');
if (paginateEl) {
  paginateEl.classList.add('text-end'); // Add Bootstrap class to align to the right
}
  
  
  
    // Handle row click events
    tableEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tr = target.closest('tr');
      if (tr && this.dt) {
        const rowData = this.dt.row(tr).data() as Member;
        if (rowData) {
          this.openMemberDetail(rowData);
        }
      }
    });
  }
  

  public destroy(): void {
    if (this.dt) {
      this.dt.destroy();
      this.dt = null;
    }
  }

  private async openMemberDetail(member: Member): Promise<void> {
    try {
      const fullMember = await ApiClient.getMember(member.id);

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="background-color: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700; text-transform: uppercase;">Digital Banking Member</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--neutral-900);">${escapeHtml(fullMember.first_name)} ${escapeHtml(fullMember.last_name)}</div>
          </div>
          <span class="badge badge-onboarded">Active Online Banking</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Member Number</div>
            <div class="cell-mono" style="font-weight: 700; font-size: 1rem; color: var(--primary); margin-top: 0.15rem;">
              ${escapeHtml(fullMember.member_number)}
            </div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Account Number</div>
            <div class="cell-mono" style="font-weight: 700; font-size: 1rem; margin-top: 0.15rem;">
              ${escapeHtml(fullMember.account_number)}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--neutral-700); text-transform: uppercase; margin-bottom: 0.75rem;">Profile & Identification</h4>
          <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; font-size: 0.875rem;">
            <dt style="color: var(--neutral-500);">National ID:</dt>
            <dd class="cell-mono">${escapeHtml(fullMember.id_number)}</dd>

            <dt style="color: var(--neutral-500);">Phone Number:</dt>
            <dd class="cell-mono">${escapeHtml(fullMember.phone_number)}</dd>

            <dt style="color: var(--neutral-500);">Date of Birth:</dt>
            <dd class="cell-mono">${escapeHtml(fullMember.date_of_birth)}</dd>

            <dt style="color: var(--neutral-500);">Email Address:</dt>
            <dd>${escapeHtml(fullMember.email)}</dd>

            <dt style="color: var(--neutral-500);">Assigned Branch:</dt>
            <dd>${escapeHtml(fullMember.branch)}</dd>

            <dt style="color: var(--neutral-500);">Account Type:</dt>
            <dd style="text-transform: capitalize;">${escapeHtml(fullMember.account_type)}</dd>

            <dt style="color: var(--neutral-500);">Source Batch:</dt>
            <dd>
              <a href="#/batch/${fullMember.source_upload_id}" id="link-source-batch" style="color: var(--primary); text-decoration: underline; font-family: var(--font-mono); font-size: 0.825rem;">
                ${fullMember.source_upload_id.slice(0, 13)}...
              </a>
            </dd>

            <dt style="color: var(--neutral-500);">Date Onboarded:</dt>
            <dd class="cell-mono" style="font-size: 0.825rem;">${formatDate(fullMember.created_at)}</dd>
          </dl>
        </div>
      `;

      const modal = new Modal({
        title: `Member: ${fullMember.first_name} ${fullMember.last_name}`,
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

      content.querySelector('#link-source-batch')?.addEventListener('click', () => {
        modal.close();
      });

      modal.open();
    } catch (err) {
      ToastManager.error(`Failed to load member profile: ${err instanceof Error ? err.message : String(err)}`);
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
