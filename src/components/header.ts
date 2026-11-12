import { apiConfig } from '../config/api-config';
import { SettingsDrawer } from '../views/settings-drawer';
import { NewBatchModal } from '../views/new-batch-modal';
import { WalkthroughModal } from '../views/walkthrough-modal';

export class HeaderComponent {
  private el: HTMLElement;
  private statusBadgeEl: HTMLElement | null = null;
  private healthInterval: number | null = null;

  constructor() {
    this.el = document.createElement('header');
    this.el.className = 'site-header';
    this.render();
    this.startHealthPolling();
  }

  public render(): HTMLElement {
    this.el.innerHTML = `
      <div class="header-inner">
        <a href="#/batches" class="header-brand">
          <div class="brand-logo" aria-hidden="true">DB</div>
          <div class="brand-info">
            <h1>DigiBanking Portal</h1>
            <p>Bulk Member Onboarding</p>
          </div>
        </a>

        <nav aria-label="Main Navigation">
          <ul class="nav-links">
            <li>
              <a href="#/batches" class="nav-link" id="nav-batches">
               Batches
              </a>
            </li>
            <li>
              <a href="#/members" class="nav-link" id="nav-members">
                Onboarded Members
              </a>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-walkthrough-header" title="Open 9-Step Walkthrough Guide">
            Walkthrough
          </button>

          <button type="button" class="api-status-badge offline" id="api-status-indicator" title="Click to check or configure API address">
            <span class="status-dot"></span>
            <span class="status-text">Checking API...</span>
          </button>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-settings-header" title="Configure API Endpoint">
             Settings
          </button>

         
        </div>
      </div>
    `;

    this.statusBadgeEl = this.el.querySelector('#api-status-indicator');

    this.statusBadgeEl?.addEventListener('click', () => {
      SettingsDrawer.open();
    });

    this.el.querySelector('#btn-walkthrough-header')?.addEventListener('click', () => {
      WalkthroughModal.open();
    });

    this.el.querySelector('#btn-settings-header')?.addEventListener('click', () => {
      SettingsDrawer.open();
    });

    this.el.querySelector('#btn-new-batch-header')?.addEventListener('click', () => {
      NewBatchModal.open();
    });

    this.updateActiveNav();
    window.addEventListener('hashchange', () => this.updateActiveNav());

    return this.el;
  }

  public updateActiveNav(): void {
    const hash = window.location.hash || '#/batches';
    const batchesNav = this.el.querySelector('#nav-batches');
    const membersNav = this.el.querySelector('#nav-members');

    if (hash.startsWith('#/members')) {
      membersNav?.classList.add('active');
      batchesNav?.classList.remove('active');
    } else {
      batchesNav?.classList.add('active');
      membersNav?.classList.remove('active');
    }
  }

  public async checkApiStatus(): Promise<void> {
    if (!this.statusBadgeEl) return;
    const status = await apiConfig.checkHealth();
    if (status.online) {
      this.statusBadgeEl.className = 'api-status-badge online';
      this.statusBadgeEl.querySelector('.status-text')!.textContent = `API Online (${status.latencyMs}ms)`;
    } else {
      this.statusBadgeEl.className = 'api-status-badge offline';
      this.statusBadgeEl.querySelector('.status-text')!.textContent = 'API Offline';
    }
  }

  private startHealthPolling(): void {
    this.checkApiStatus();
    this.healthInterval = window.setInterval(() => {
      this.checkApiStatus();
    }, 15000);

    apiConfig.subscribe(() => {
      this.checkApiStatus();
    });
  }

  public destroy(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
  }

  public getElement(): HTMLElement {
    return this.el;
  }
}
