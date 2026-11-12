import './styles/main.css';
import { themeManager } from './config/theme-manager';
import { HeaderComponent } from './components/header';
import { AppRouter } from './router';
import { apiConfig } from './config/api-config';

async function bootstrap() {
  themeManager.apply();
  const root = document.getElementById('app');
  if (!root) throw new Error('#app root container missing');

  // Attempt to read custom configuration from config.xml if no custom URL saved
  if (!localStorage.getItem('digibanking_api_base_url')) {
    try {
      const res = await fetch('/config.xml');
      
      if (res.ok) {
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const configuredUrl = doc.querySelector('configuration > api > url')?.textContent?.trim();
        const port = doc.querySelector('configuration > api > port')?.textContent?.trim();

        if (configuredUrl) {
          apiConfig.setBaseUrl(configuredUrl);
        } else if (port && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          apiConfig.setBaseUrl(`http://localhost:${port}/api/v1`);
        }
      }
    } catch (error) {
      console.warn('Failed to load /config.xml', error);
    }
  }

  // App Layout structure
  const container = document.createElement('div');
  container.className = 'app-container';

  // Header
  const header = new HeaderComponent();
  container.appendChild(header.render());

  // Main Outlet
  const main = document.createElement('main');
  main.id = 'app-main';
  main.className = 'main-content';
  container.appendChild(main);

  // Footer
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div style="max-width: 1320px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 1rem;">
      <div>
        <strong>DigiBanking Bulk Onboarding Portal</strong> &mdash; Staff Interface
      </div>
      <div>
        Security Policy: All operations are audited.
      </div>
    </div>
  `;
  container.appendChild(footer);

  root.appendChild(container);

  // Router
  const router = new AppRouter(main);
  router.init();
}

bootstrap().catch(console.error);

