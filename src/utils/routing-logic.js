/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 路由与客户端模式判断逻辑（纯 JavaScript）
 * 支持独立启动、独立部署以及统一混合部署
 *
 * @param {object} params
 * @param {string} [params.pathname] URL 路径，如 '/pc', '/web', '/mobile', '/app'
 * @param {string} [params.search] URL 查询参数，如 '?mode=pc'
 * @param {string} [params.envMode] 环境变量构建模式 VITE_APP_MODE ('mobile' | 'web' | 'pc')
 * @param {string} [params.savedMode] 本地持久化模式
 * @param {number} [params.windowWidth] 窗口宽度
 * @returns {'app' | 'pc'}
 */
export function resolveClientMode(params = {}) {
  const { pathname = '', search = '', envMode = '', savedMode = '', windowWidth = 0 } = params;

  // 1. 编译环境变量强制覆盖（独立部署模式）
  const normalizedEnv = String(envMode || '').toLowerCase().trim();
  if (normalizedEnv === 'mobile' || normalizedEnv === 'app') {
    return 'app';
  }
  if (normalizedEnv === 'web' || normalizedEnv === 'pc') {
    return 'pc';
  }

  // 2. URL Path 独立访问路径优先级最高
  const lowerPath = String(pathname || '').toLowerCase();
  if (
    lowerPath === '/pc' ||
    lowerPath.startsWith('/pc/') ||
    lowerPath === '/web' ||
    lowerPath.startsWith('/web/') ||
    lowerPath.endsWith('/web.html') ||
    lowerPath.endsWith('/pc.html')
  ) {
    return 'pc';
  }

  if (
    lowerPath === '/mobile' ||
    lowerPath.startsWith('/mobile/') ||
    lowerPath === '/app' ||
    lowerPath.startsWith('/app/') ||
    lowerPath.endsWith('/mobile.html')
  ) {
    return 'app';
  }

  // 3. URL Query 参数（如 ?mode=pc 或 ?mode=app）
  const lowerSearch = String(search || '').toLowerCase();
  if (lowerSearch.includes('mode=pc') || lowerSearch.includes('mode=web')) {
    return 'pc';
  }
  if (lowerSearch.includes('mode=mobile') || lowerSearch.includes('mode=app')) {
    return 'app';
  }

  // 4. 用户手动选择的持久化偏好
  if (savedMode === 'pc' || savedMode === 'app') {
    return savedMode;
  }

  // 5. 屏幕尺寸默认智能推荐
  if (typeof windowWidth === 'number' && windowWidth >= 1024) {
    return 'pc';
  }

  return 'app';
}
