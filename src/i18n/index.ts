import i18next from 'i18next';
import fs from 'fs-extra';
import path from 'path';

let initialized = false;

async function getLocalesDir(): Promise<string> {
  const possiblePaths = [
    path.join(__dirname, '..', 'locales'),
    path.join(__dirname, 'locales'),
    path.join(process.cwd(), 'src', 'locales'),
    path.join(process.cwd(), 'locales')
  ];
  
  for (const p of possiblePaths) {
    if (await fs.pathExists(p)) {
      return p;
    }
  }
  
  return path.join(__dirname, '..', 'locales');
}

export async function initI18n(): Promise<void> {
  if (initialized) return;
  
  const localesDir = await getLocalesDir();
  
  const resources: any = {};
  
  const zhCNPath = path.join(localesDir, 'zh-CN.json');
  const enUSPath = path.join(localesDir, 'en-US.json');
  
  if (await fs.pathExists(zhCNPath)) {
    resources['zh-CN'] = { translation: await fs.readJson(zhCNPath) };
  }
  
  if (await fs.pathExists(enUSPath)) {
    resources['en-US'] = { translation: await fs.readJson(enUSPath) };
  }
  
  const lang = process.env.SEMI_NEXUS_LANG || 
               process.env.LANG?.split('.')[0]?.replace('_', '-') || 
               'zh-CN';
  
  await i18next.init({
    lng: lang.startsWith('zh') ? 'zh-CN' : 'en-US',
    fallbackLng: 'en-US',
    resources,
    interpolation: {
      escapeValue: false
    }
  });
  
  initialized = true;
}

export function t(key: string, options?: any): any {
  return i18next.t(key, options);
}

export function getCurrentLanguage(): string {
  return i18next.language;
}

export async function setLanguage(lang: string): Promise<void> {
  await i18next.changeLanguage(lang);
}

export { i18next };
