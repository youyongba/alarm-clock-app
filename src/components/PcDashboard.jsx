/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import WebApp from '@/web/WebApp.jsx';

/**
 * PC 控制台兼容导出层
 * 统一委托至已解耦的模块化页面 @/web/WebApp.jsx
 */
export default function PcDashboard(props) {
  return <WebApp {...props} />;
}

export { WebApp };
