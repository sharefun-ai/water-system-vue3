export const UNCONNECTED_MESSAGE = '公開網站尚未連接資料服務；請於本機圖控查看量測數據。'
export function createDataSourceConfig(env = {}) {
  const configuredRoot = String(env.VITE_API_ROOT || '').trim().replace(/\/$/, '')
  if (configuredRoot && !configuredRoot.startsWith('/') && !/^https:\/\//.test(configuredRoot)) throw new Error('VITE_API_ROOT 必須是 HTTPS 網址或同站路徑')
  const publicSite = env.VITE_PUBLIC_SITE === 'true'
  return Object.freeze({ apiRoot: configuredRoot || (env.DEV ? '/backend' : '/' + encodeURIComponent('水系統3.0') + '/backend'), unavailable: publicSite && !configuredRoot, publicSite })
}
export const dataSource = createDataSourceConfig(import.meta.env || {})
export const DATA_API_ROOT = dataSource.apiRoot
export const CLOUD_SIMULATION = import.meta.env?.VITE_DATA_SOURCE === 'simulation'
export function requireDataSource(config = dataSource) { if(config.unavailable) throw new Error(UNCONNECTED_MESSAGE) }
