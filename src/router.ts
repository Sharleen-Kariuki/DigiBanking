import { BatchesView } from './views/batches-view';
import { BatchDetailView } from './views/batch-detail-view';
import { MembersView } from './views/members-view';

export interface ViewInstance {
  render(): Promise<HTMLElement>;
  destroy?(): void;
}

export class AppRouter {
  private outlet: HTMLElement;
  private currentView: ViewInstance | null = null;

  constructor(outlet: HTMLElement) {
    this.outlet = outlet;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  public init(): void {
    if (!window.location.hash) {
      window.location.hash = '#/batches';
    } else {
      this.handleRoute();
    }
  }

  private async handleRoute(): Promise<void> {
    const hash = window.location.hash || '#/batches';

    // Cleanup active view
    if (this.currentView?.destroy) {
      this.currentView.destroy();
      this.currentView = null;
    }

    this.outlet.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; padding: 4rem 1rem; color: var(--neutral-400);">
        <span>Loading...</span>
      </div>
    `;

    try {
      // Routes to a specific batchview 
      if (hash.startsWith('#/batch/')) {
        const uploadId = hash.replace('#/batch/', '').split('?')[0];
        const view = new BatchDetailView(uploadId);
        this.currentView = view;
        const el = await view.render();
        this.outlet.innerHTML = '';
        this.outlet.appendChild(el);

      // Routes to the members view 
      } else if (hash.startsWith('#/members')) {
        const view = new MembersView();
        this.currentView = view;
        const el = await view.render();
        this.outlet.innerHTML = '';
        this.outlet.appendChild(el);
      } else {
        // Routes to the batch view
        const view = new BatchesView();
        this.currentView = view;
        const el = await view.render();
        this.outlet.innerHTML = '';
        this.outlet.appendChild(el);
      }
    } catch (err) {
      this.outlet.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Page Load Error</div>
          <div class="empty-description">${err instanceof Error ? err.message : String(err)}</div>
          <a href="#/batches" class="btn btn-primary">Return to Batches</a>
        </div>
      `;
    }
  }
}
