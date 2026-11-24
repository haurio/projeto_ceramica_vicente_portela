const rawVersion = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim().replace(/^[vV]/, '');
export const APP_VERSION = rawVersion || '1.0.0';

export function getAppVersionLabel() {
    const environment = import.meta.env.PROD ? 'Production' : 'Development';
    return `V${APP_VERSION} - ${environment}`;
}
