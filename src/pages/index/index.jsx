/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import MobileApp from '@/mobile/MobileApp.jsx';
import WebApp from '@/web/WebApp.jsx';
import { resolveClientMode } from '@/utils/routing-logic.js';
import './index.scss';

/**
 * 客户端顶级主路由页面
 * 根据访问路径、屏幕尺寸或环境变量智能分发至移动端或 Web 控制台
 * 支持用户在移动端和 PC 端之间一键无缝切换
 */
export default function IndexPage({ forcedMode }) {
  // 视图模式: 'app' (移动端 APP) | 'pc' (PC 控制台)
  const [viewMode, setViewMode] = useState(() => {
    if (forcedMode === 'app' || forcedMode === 'pc') return forcedMode;
    let saved = '';
    try {
      saved = localStorage.getItem('pomodoro_view_mode') || '';
    } catch {}
    return resolveClientMode({
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      search: typeof window !== 'undefined' ? window.location.search : '',
      envMode: import.meta.env?.VITE_APP_MODE || '',
      savedMode: saved,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 375,
    });
  });

  const handleSwitchViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('pomodoro_view_mode', mode);
    } catch {}
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const targetPath = mode === 'pc' ? '/web' : '/';
      window.history.pushState({}, '', targetPath);
    }
  };

  if (viewMode === 'pc') {
    return (
      <WebApp
        onSwitchToApp={() => handleSwitchViewMode('app')}
      />
    );
  }

  return (
    <MobileApp
      onSwitchToPc={() => handleSwitchViewMode('pc')}
    />
  );
}
