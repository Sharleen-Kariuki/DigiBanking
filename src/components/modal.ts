export interface ModalOptions {
  title: string;
  content: HTMLElement | string;
  footerButtons?: Array<{
    label: string;
    className?: string;
    onClick: (modal: Modal) => void;
  }>;
  onClose?: () => void;
  maxWidth?: string;
}

export class Modal {
  private backdropEl: HTMLElement;
  private dialogEl: HTMLElement;
  private options: ModalOptions;
  private previouslyFocusedEl: HTMLElement | null = null;

  constructor(options: ModalOptions) {
    this.options = options;
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'modal-backdrop';
    this.backdropEl.setAttribute('role', 'dialog');
    this.backdropEl.setAttribute('aria-modal', 'true');
    this.backdropEl.setAttribute('aria-labelledby', 'modal-title-id');

    this.dialogEl = document.createElement('div');
    this.dialogEl.className = 'modal-dialog';
    if (options.maxWidth) {
      this.dialogEl.style.maxWidth = options.maxWidth;
    }

    this.render();
    this.bindEvents();
  }

  private render(): void {
    const headerEl = document.createElement('div');
    headerEl.className = 'modal-header';

    const titleEl = document.createElement('h2');
    titleEl.id = 'modal-title-id';
    titleEl.className = 'modal-title';
    titleEl.textContent = this.options.title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    headerEl.appendChild(titleEl);
    headerEl.appendChild(closeBtn);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'modal-body';
    if (typeof this.options.content === 'string') {
      bodyEl.innerHTML = this.options.content;
    } else {
      bodyEl.appendChild(this.options.content);
    }

    this.dialogEl.appendChild(headerEl);
    this.dialogEl.appendChild(bodyEl);

    if (this.options.footerButtons && this.options.footerButtons.length > 0) {
      const footerEl = document.createElement('div');
      footerEl.className = 'modal-footer';

      this.options.footerButtons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        btn.textContent = btnConfig.label;
        btn.addEventListener('click', () => btnConfig.onClick(this));
        footerEl.appendChild(btn);
      });

      this.dialogEl.appendChild(footerEl);
    }

    this.backdropEl.appendChild(this.dialogEl);
  }

  private bindEvents(): void {
    this.backdropEl.addEventListener('click', e => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    this.backdropEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  public open(): void {
    this.previouslyFocusedEl = document.activeElement as HTMLElement;
    document.body.appendChild(this.backdropEl);
    document.body.style.overflow = 'hidden';

    // Force reflow for transition
    void this.backdropEl.offsetHeight;
    this.backdropEl.classList.add('open');

    const firstInput = this.dialogEl.querySelector<HTMLElement>('input, button, select, textarea');
    firstInput?.focus();
  }

  public close(): void {
    this.backdropEl.classList.remove('open');
    document.body.style.overflow = '';

    setTimeout(() => {
      this.backdropEl.remove();
      if (this.previouslyFocusedEl) {
        this.previouslyFocusedEl.focus();
      }
      if (this.options.onClose) {
        this.options.onClose();
      }
    }, 200);
  }

  public getElement(): HTMLElement {
    return this.backdropEl;
  }
}

