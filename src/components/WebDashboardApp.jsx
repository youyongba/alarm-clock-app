/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import WebApp from '@/web/WebApp.jsx';

/**
 * 独立的 Web / PC 端控制台应用（可独立部署、独立挂载）
 * 统一委托给解耦后的 @/web/WebApp.jsx 业务模块
 * @param {object} props
 * @param {() => void} [props.onSwitchToApp] 切换到移动端视图
 */
export default function WebDashboardApp({ onSwitchToApp }) {
  const handleSwitchToMobile = useCallback(() => {
    try {
      localStorage.setItem('pomodoro_view_mode', 'app');
    } catch {}
    if (onSwitchToApp) {
      onSwitchToApp();
    } else {
      window.location.href = '/';
    }
  }, [onSwitchToApp]);

  return <WebApp onSwitchToApp={handleSwitchToMobile} />;
}
