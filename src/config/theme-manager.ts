export type ThemeName = 'blue' | 'green' | 'burgundy';

const THEME_STORAGE_KEY = 'digibanking_theme';
const FONT_STORAGE_KEY = 'digibanking_font_size';

export const THEMES: Record<ThemeName, { label: string; primaryHex: string; desc: string }> = {
  blue: {
    label: 'Navy Blue',
    primaryHex: '#1e3a8a',
    desc: 'Classic Corporate Banking'
  },
  green: {
    label: 'Emerald Green',
    primaryHex: '#047857',
    desc: 'Wealth & Digital Finance'
  },
  burgundy: {
    label: 'Burgundy',
    primaryHex: '#831843',
    desc: 'Private & Premier Banking'
  }
};

class ThemeManager {
  private currentTheme: ThemeName = 'blue';
  private currentFontSize = 16; // 13px to 19px
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
    this.apply();
  }

  private loadFromStorage(): void {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    if (savedTheme && (savedTheme === 'blue' || savedTheme === 'green' || savedTheme === 'burgundy')) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'blue';
    }

    const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
    if (savedFont) {
      const parsed = parseInt(savedFont, 10);
      if (!isNaN(parsed) && parsed >= 12 && parsed <= 20) {
        this.currentFontSize = parsed;
      }
    }
  }

  public getTheme(): ThemeName {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.apply();
    this.notify();
  }

  public getFontSize(): number {
    return this.currentFontSize;
  }

  public setFontSize(sizePx: number): void {
    const clamped = Math.max(12, Math.min(20, sizePx));
    this.currentFontSize = clamped;
    localStorage.setItem(FONT_STORAGE_KEY, String(clamped));
    this.apply();
    this.notify();
  }

  public apply(): void {
    // Apply theme attribute to root
    if (this.currentTheme === 'blue') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', this.currentTheme);
    }

    // Apply font size directly to root html
    document.documentElement.style.fontSize = `${this.currentFontSize}px`;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('ThemeManager listener error:', err);
      }
    });
  }
}

export const themeManager = new ThemeManager();

