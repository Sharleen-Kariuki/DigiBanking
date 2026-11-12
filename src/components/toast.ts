export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export class ToastManager {
  private static container: HTMLElement | null = null;

  private static ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  public static show(message: string, type: ToastType = 'info', durationMs = 5000): void {
    const container = this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    const icons: Record<ToastType, string> = {
      info: '<i class="fa-solid fa-circle-info"></i>',
      success: '<i class="fa-solid fa-circle-check"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
      danger: '<i class="fa-solid fa-circle-xmark"></i>'
    };

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type]}</span>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 200ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, durationMs);
  }

  public static success(message: string, durationMs = 5000): void {
    this.show(message, 'success', durationMs);
  }

  public static error(message: string, durationMs = 7000): void {
    this.show(message, 'danger', durationMs);
  }

  public static warning(message: string, durationMs = 6000): void {
    this.show(message, 'warning', durationMs);
  }

  public static info(message: string, durationMs = 5000): void {
    this.show(message, 'info', durationMs);
  }
}

