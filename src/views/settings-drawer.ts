import { themeManager, ThemeName, THEMES } from '../config/theme-manager';
import { apiConfig } from '../config/api-config';
import { ToastManager } from '../components/toast';

export class SettingsDrawer {
  private static instance: SettingsDrawer | null = null;
  private backdropEl: HTMLElement;
  private drawerEl: HTMLElement;
  private previouslyFocusedEl: HTMLElement | null = null;

  constructor() {
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'drawer-backdrop';
    this.backdropEl.setAttribute('role', 'dialog');
    this.backdropEl.setAttribute('aria-modal', 'true');
    this.backdropEl.setAttribute('aria-labelledby', 'drawer-title-id');

    this.drawerEl = document.createElement('aside');
    this.drawerEl.className = 'side-drawer';

    this.render();
    this.bindEvents();
  }

  public static open(): void {
    if (!this.instance) {
      this.instance = new SettingsDrawer();
    }
    this.instance.show();
  }

  private render(): void {
    const currentTheme = themeManager.getTheme();
    const currentFontSize = themeManager.getFontSize();
    const currentApiUrl = apiConfig.getBaseUrl();

    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <h3 id="drawer-title-id" class="drawer-title">
          Portal Settings
        </h3>
        <button type="button" class="drawer-close-btn" id="drawer-close-btn" aria-label="Close Settings Drawer">
          &times;
        </button>
      </div>

      <div class="drawer-body">
        <!-- Section 1: Appearance & Color Themes -->
        <div class="drawer-section">
          <div class="drawer-section-title">
            Color Theme
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-500); margin-bottom: 0.25rem;">
            Choose an institutional digital banking color scheme:
          </p>

          <div class="theme-selector-grid">
            <!-- Blue -->
            <button
              type="button"
              class="theme-card ${currentTheme === 'blue' ? 'active' : ''}"
              data-theme="blue"
              title="Classic Navy Blue Corporate Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6);">
                ${currentTheme === 'blue' ? '<i class="fa-solid fa-check"></i>' : ''}
              </div>
              <span class="theme-card-label">Navy Blue</span>
            </button>

            <!-- Green -->
            <button
              type="button"
              class="theme-card ${currentTheme === 'green' ? 'active' : ''}"
              data-theme="green"
              title="Emerald Green Wealth & Investment Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #047857, #10b981);">
                ${currentTheme === 'green' ? '<i class="fa-solid fa-check"></i>' : ''}
              </div>
              <span class="theme-card-label">Emerald</span>
            </button>

            <!-- Burgundy -->
            <button
              type="button"
              class="theme-card ${currentTheme === 'burgundy' ? 'active' : ''}"
              data-theme="burgundy"
              title="Rich Burgundy Premier Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #831843, #be185d);">
                ${currentTheme === 'burgundy' ? '<i class="fa-solid fa-check"></i>' : ''}
              </div>
              <span class="theme-card-label">Burgundy</span>
            </button>
          </div>
        </div>

        <!-- Section 2: Font Size Slider -->
        <div class="drawer-section">
          <div class="drawer-section-title">
             Interface Font Size
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-500); margin-bottom: 0.25rem;">
            Adjust the typography size across all tables, forms, and cards:
          </p>

          <div class="font-slider-container">
            <div class="font-slider-header">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--neutral-700);">Current Size:</span>
              <span class="font-slider-value" id="font-slider-readout">${currentFontSize}px</span>
            </div>

            <input
              type="range"
              id="font-size-slider"
              class="font-slider-input"
              min="13"
              max="19"
              step="1"
              value="${currentFontSize}"
              aria-label="Font size slider"
            />

            <div class="font-slider-ticks">
              <span>13px (Compact)</span>
              <span>16px (Default)</span>
              <span>19px (Large)</span>
            </div>

            <div class="font-preset-buttons">
              <button type="button" class="font-preset-btn ${currentFontSize === 14 ? 'active' : ''}" data-size="14">
                Compact (14px)
              </button>
              <button type="button" class="font-preset-btn ${currentFontSize === 16 ? 'active' : ''}" data-size="16">
                Default (16px)
              </button>
              <button type="button" class="font-preset-btn ${currentFontSize === 18 ? 'active' : ''}" data-size="18">
                Large (18px)
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: API & Service Endpoint -->
        <div class="drawer-section">
        
        

          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label" for="drawer-api-url" style="font-size: 0.8rem;">API Base Address</label>
            <input
              type="url"
              id="drawer-api-url"
              class="form-control"
              style="font-size: 0.85rem;"
              value="${currentApiUrl}"
              placeholder="http://localhost:3000/api/v1"
            />
          </div>

          

          <div style="background-color: var(--neutral-50); border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 600; font-size: 0.8rem; color: var(--neutral-700);">API Connection Test:</span>
              <button type="button" class="btn btn-sm btn-outline-primary" id="drawer-btn-ping">
                Test /health
              </button>
            </div>
            <div id="drawer-ping-output" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--neutral-600);">
              Click "Test /health" to check connection.
            </div>
          </div>

          <button type="button" class="btn btn-primary" id="drawer-btn-save-api" style="width: 100%; margin-top: 0.75rem;">
            Save API Settings
          </button>
        </div>
      </div>
    `;

    this.backdropEl.appendChild(this.drawerEl);
  }

  private bindEvents(): void {
    // Backdrop click and Esc
    this.backdropEl.addEventListener('click', e => {
      if (e.target === this.backdropEl) {
        this.hide();
      }
    });

    this.backdropEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Close button
    this.drawerEl.querySelector('#drawer-close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // Theme selector
    this.drawerEl.querySelectorAll<HTMLButtonElement>('.theme-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.theme as ThemeName;
        if (selected) {
          themeManager.setTheme(selected);
          this.updateActiveTheme(selected);
          ToastManager.info(`Theme switched to ${THEMES[selected].label}.`);
        }
      });
    });

    // Font size slider
    const slider = this.drawerEl.querySelector<HTMLInputElement>('#font-size-slider')!;
    const readout = this.drawerEl.querySelector<HTMLElement>('#font-slider-readout')!;

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      readout.textContent = `${val}px`;
      themeManager.setFontSize(val);
      this.updateActiveFontPresets(val);
    });

    // Font preset buttons
    this.drawerEl.querySelectorAll<HTMLButtonElement>('.font-preset-btn').forEach(presetBtn => {
      presetBtn.addEventListener('click', () => {
        const size = parseInt(presetBtn.dataset.size || '16', 10);
        slider.value = String(size);
        readout.textContent = `${size}px`;
        themeManager.setFontSize(size);
        this.updateActiveFontPresets(size);
      });
    });

    // API Presets
    const apiInput = this.drawerEl.querySelector<HTMLInputElement>('#drawer-api-url')!;
    this.drawerEl.querySelector('#drawer-preset-3000')?.addEventListener('click', () => {
      apiInput.value = 'http://localhost:3000/api/v1';
    });
    this.drawerEl.querySelector('#drawer-preset-3100')?.addEventListener('click', () => {
      apiInput.value = 'http://localhost:3100/api/v1';
    });
    this.drawerEl.querySelector('#drawer-btn-reset-api')?.addEventListener('click', () => {
      apiInput.value = 'http://localhost:3000/api/v1';
    });

    // Ping health test
    const pingBtn = this.drawerEl.querySelector<HTMLButtonElement>('#drawer-btn-ping')!;
    const pingOutput = this.drawerEl.querySelector<HTMLElement>('#drawer-ping-output')!;

    pingBtn.addEventListener('click', async () => {
      pingOutput.innerHTML = '<span style="color: var(--neutral-500);">Checking API health...</span>';
      pingBtn.disabled = true;

      const testUrl = apiInput.value.trim().replace(/\/+$/, '');
      const prevUrl = apiConfig.getBaseUrl();
      apiConfig.setBaseUrl(testUrl);

      try {
        const health = await apiConfig.checkHealth();
        if (health.online) {
          pingOutput.innerHTML = `
            <div style="color: var(--success); font-weight: 600;">
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Connected successfully (${health.latencyMs}ms)
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.2rem; color: var(--neutral-600);">
              Service: <strong>${health.service || 'bulk-onboarding-api'}</strong> | DB: <strong>${health.database || 'sqlite'}</strong>
            </div>
          `;
        } else {
          pingOutput.innerHTML = `
            <div style="color: var(--danger); font-weight: 600;">
              <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Connection failed: ${health.error || 'Server unreachable'}
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.2rem; color: var(--neutral-500);">
              Ensure <code>windows-x64\\run.bat</code> is running on this port.
            </div>
          `;
        }
      } finally {
        apiConfig.setBaseUrl(prevUrl);
        pingBtn.disabled = false;
      }
    });

    // Save API button
    this.drawerEl.querySelector('#drawer-btn-save-api')?.addEventListener('click', () => {
      const newUrl = apiInput.value.trim();
      if (!newUrl) {
        ToastManager.error('API Base URL cannot be empty.');
        return;
      }
      apiConfig.setBaseUrl(newUrl);
      ToastManager.success('API configuration saved.');
      this.hide();
    });
  }

  private updateActiveTheme(theme: ThemeName): void {
    this.drawerEl.querySelectorAll<HTMLButtonElement>('.theme-card').forEach(card => {
      const cardTheme = card.dataset.theme;
      const disc = card.querySelector('.theme-color-disc');
      if (cardTheme === theme) {
        card.classList.add('active');
        if (disc) disc.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else {
        card.classList.remove('active');
        if (disc) disc.innerHTML = '';
      }
    });
  }

  private updateActiveFontPresets(size: number): void {
    this.drawerEl.querySelectorAll<HTMLButtonElement>('.font-preset-btn').forEach(btn => {
      const btnSize = parseInt(btn.dataset.size || '0', 10);
      if (btnSize === size) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public show(): void {
    this.previouslyFocusedEl = document.activeElement as HTMLElement;

    // Refresh current values in form
    const currentTheme = themeManager.getTheme();
    const currentFont = themeManager.getFontSize();
    this.updateActiveTheme(currentTheme);

    const slider = this.drawerEl.querySelector<HTMLInputElement>('#font-size-slider');
    const readout = this.drawerEl.querySelector<HTMLElement>('#font-slider-readout');
    if (slider) slider.value = String(currentFont);
    if (readout) readout.textContent = `${currentFont}px`;
    this.updateActiveFontPresets(currentFont);

    const apiInput = this.drawerEl.querySelector<HTMLInputElement>('#drawer-api-url');
    if (apiInput) apiInput.value = apiConfig.getBaseUrl();

    document.body.appendChild(this.backdropEl);
    document.body.style.overflow = 'hidden';

    // Force reflow for CSS transition
    void this.backdropEl.offsetHeight;
    this.backdropEl.classList.add('open');

    const closeBtn = this.drawerEl.querySelector<HTMLElement>('#drawer-close-btn');
    closeBtn?.focus();
  }

  public hide(): void {
    this.backdropEl.classList.remove('open');
    document.body.style.overflow = '';

    setTimeout(() => {
      this.backdropEl.remove();
      if (this.previouslyFocusedEl) {
        this.previouslyFocusedEl.focus();
      }
    }, 250);
  }
}

