import { ApiClient } from '../services/api-client';
import { Member, PaginatedResponse } from '../types';
import { ToastManager } from '../components/toast';
import { Modal } from '../components/modal';
import { DataTable, DataTableColumn } from '../services/datatable';

export class MembersView {
  private container: HTMLElement;
  private dataTable: DataTable<Member>;
  private currentPage = 1;
  private pageSize = 20;
  private searchQuery = '';
  private orderBy = 'created_at desc';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'members-view';

    const columns: DataTableColumn<Member>[] = [
      {
        id: 'member_number',
        header: 'Member #',
        sortable: true,
        sortKey: 'member_number',
        width: '140px',
        className: 'cell-mono cell-bold',
        render: row => `<span style="color: var(--primary);">${escapeHtml(row.member_number)}</span>`
      },
      {
        id: 'full_name',
        header: 'Full Name',
        sortable: true,
        sortKey: 'last_name',
        className: 'cell-bold',
        render: row => escapeHtml(`${row.first_name} ${row.last_name}`)
      },
      {
        id: 'identifiers',
        header: 'Identifiers (ID & Phone)',
        className: 'cell-mono',
        render: row => `
          <div style="font-size: 0.8rem; line-height: 1.35;">
            <div>ID: ${escapeHtml(row.id_number || '—')}</div>
            <div style="color: var(--neutral-500);">Tel: ${escapeHtml(row.phone_number || '—')}</div>
          </div>
        `
      },
      {
        id: 'branch',
        header: 'Branch',
        sortable: true,
        sortKey: 'branch',
        accessor: 'branch'
      },
      {
        id: 'account',
        header: 'Account Type & No.',
        className: 'cell-mono',
        render: row => `
          <div style="font-size: 0.825rem;">
            <span style="font-weight: 600; text-transform: capitalize;">${escapeHtml(row.account_type)}</span>
            <div style="color: var(--neutral-500); font-size: 0.775rem;">${escapeHtml(row.account_number || '—')}</div>
          </div>
        `
      },
      {
        id: 'created_at',
        header: 'Onboarded At',
        sortable: true,
        sortKey: 'created_at',
        width: '150px',
        className: 'cell-mono',
        render: row => `<span style="font-size: 0.8rem; color: var(--neutral-600);">${formatDate(row.created_at)}</span>`
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
          btn.textContent = 'View';
          btn.addEventListener('click', e => {
            e.stopPropagation();
            this.openMemberDetail(row);
          });
          return btn;
        }
      }
    ];

    this.dataTable = new DataTable<Member>({
      tableId: 'members_table',
      columns,
      pageSize: this.pageSize,
      searchPlaceholder: 'Search by member #, name, phone, or national ID...',
      initialSort: { columnId: 'created_at', direction: 'desc' },
      emptyTitle: 'No onboarded members found',
      emptyMessage: 'No members matched your search criteria.',
      onSearch: query => {
        this.searchQuery = query;
        this.currentPage = 1;
        this.loadMembers();
      },
      onSort: (_colId, dir, sortKey) => {
        this.orderBy = `${sortKey} ${dir}`;
        this.currentPage = 1;
        this.loadMembers();
      },
      onPageChange: page => {
        this.currentPage = page;
        this.loadMembers();
      },
      onPageSizeChange: size => {
        this.pageSize = size;
        this.currentPage = 1;
        this.loadMembers();
      },
      onRowClick: row => {
        this.openMemberDetail(row);
      }
    });
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
            <p class="card-subtitle">Filter columns, search in real-time, and inspect member accounts</p>
          </div>
        </div>

        <div class="card-body" id="table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>
    `;

    this.container.querySelector('#table-slot')?.appendChild(this.dataTable.getElement());

    this.container.querySelector('#btn-refresh-members')?.addEventListener('click', () => {
      this.loadMembers();
    });

    await this.loadMembers();
    return this.container;
  }

  public async loadMembers(): Promise<void> {
    this.dataTable.setLoading(true);

    try {
      const response: PaginatedResponse<Member> = await ApiClient.listMembers({
        page: this.currentPage,
        limit: this.pageSize,
        search: this.searchQuery || undefined,
        $orderby: this.orderBy,
        $count: true
      });

      this.dataTable.setData(response.data, response.pagination.total, response.pagination.page);
    } catch (err) {
      this.dataTable.setError(err instanceof Error ? err.message : String(err));
    }
  }

  public destroy(): void {}

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
        title: `Member Profile: ${fullMember.member_number}`,
        content,
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}
