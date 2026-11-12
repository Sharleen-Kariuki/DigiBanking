import { apiConfig } from '../config/api-config';
import { Modal } from '../components/modal';
import { ToastManager } from '../components/toast';

export class SettingsModal {
  public static open(): void {
    const container = document.createElement('div');

    const currentUrl = apiConfig.getBaseUrl();

    container.innerHTML = `
      <p style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 1.25rem;">
        Configure the digital banking onboarding API endpoint. The port can be adjusted to match your local service or <code>config.xml</code>.
      </p>

      <div class="form-group">
        <label class="form-label" for="api-base-url">API Base Address</label>
        <input type="url" id="api-base-url" class="form-control" value="${currentUrl}" placeholder="http://localhost:3000/api/v1" />
        <div class="form-hint">Default setting from kit: <code>http://localhost:3000/api/v1</code></div>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-sm btn-secondary" id="preset-3000">Port 3000</button>
        <button type="button" class="btn btn-sm btn-secondary" id="preset-3100">Port 3100</button>
        <button type="button" class="btn btn-sm btn-secondary" id="btn-reset">Reset to Default</button>
      </div>

      <div id="health-check-results" style="padding: 1rem; border-radius: var(--radius-md); background-color: var(--neutral-100); margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--neutral-700);">API Connection Status:</span>
          <button type="button" class="btn btn-sm btn-outline-primary" id="btn-ping">Test Health (/health)</button>
        </div>
        <div id="ping-output" style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--neutral-600);">
          Click "Test Health" to verify connection.
        </div>
      </div>
    `;

    const urlInput = container.querySelector<HTMLInputElement>('#api-base-url')!;
    const pingOutput = container.querySelector<HTMLElement>('#ping-output')!;
    const pingBtn = container.querySelector<HTMLButtonElement>('#btn-ping')!;

    container.querySelector('#preset-3000')?.addEventListener('click', () => {
      urlInput.value = 'http://localhost:3000/api/v1';
    });

    container.querySelector('#preset-3100')?.addEventListener('click', () => {
      urlInput.value = 'http://localhost:3100/api/v1';
    });

    container.querySelector('#btn-reset')?.addEventListener('click', () => {
      urlInput.value = 'http://localhost:3000/api/v1';
    });

    pingBtn.addEventListener('click', async () => {
      pingOutput.innerHTML = '<span style="color: var(--neutral-500);">Pinging API...</span>';
      pingBtn.disabled = true;

      // Temporarily test the entered value
      const testUrl = urlInput.value.trim().replace(/\/+$/, '');
      const prevUrl = apiConfig.getBaseUrl();
      apiConfig.setBaseUrl(testUrl);

      try {
        const health = await apiConfig.checkHealth();
        if (health.online) {
          pingOutput.innerHTML = `
            <div style="color: var(--success); font-weight: 600;">
              Connected successfully! (Latency: ${health.latencyMs}ms)
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.25rem;">
              Service: <strong>${health.service || 'bulk-onboarding-api'}</strong> | Database: <strong>${health.database || 'sqlite'}</strong>
            </div>
          `;
        } else {
          pingOutput.innerHTML = `
            <div style="color: var(--danger); font-weight: 600;">
              Connection failed: ${health.error || 'Server unreachable'}
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--neutral-500);">
              Ensure the onboarding API is running (<code>windows-x64\\run.bat</code>) and that the port matches.
            </div>
          `;
        }
      } finally {
        apiConfig.setBaseUrl(prevUrl); // restore until saved
        pingBtn.disabled = false;
      }
    });

    const modal = new Modal({
      title: 'API Configuration & Service Health',
      content: container,
      footerButtons: [
        {
          label: 'Cancel',
          className: 'btn-secondary',
          onClick: m => m.close()
        },
        {
          label: 'Save Configuration',
          className: 'btn-primary',
          onClick: m => {
            const newUrl = urlInput.value.trim();
            if (!newUrl) {
              ToastManager.error('API Base URL cannot be empty.');
              return;
            }
            apiConfig.setBaseUrl(newUrl);
            ToastManager.success('API configuration updated.');
            m.close();
          }
        }
      ]
    });

    modal.open();
  }
}

