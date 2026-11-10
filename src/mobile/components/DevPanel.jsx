/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Terminal,
  Globe,
  Bell,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * 移动端开发者与 WSS 连接调试面板
 * @param {object} props
 * @param {string} props.customWsUrl 当前 WebSocket 地址
 * @param {(url: string) => void} props.onUpdateWsUrl 更新 WebSocket 地址
 */
export default function DevPanel({ customWsUrl, onUpdateWsUrl }) {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedCloudCurl, setCopiedCloudCurl] = useState(false);
  const [localUrlInput, setLocalUrlInput] = useState(customWsUrl);

  const localCurlCommand = `curl -X POST http://localhost:3001/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: dev-token" \\
  -d '{"message": "测试响铃：构建成功！", "durationMs": 4000}'`;

  const cloudCurlCommand = `curl -X POST https://ais-dev-qg27xsixd57abfoxwf5fav-665504981051.asia-east1.run.app/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: dev-token" \\
  -d '{"message": "云端线上响铃触发：请立刻查收！", "durationMs": 4000}'`;

  const copyLocalCurl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(localCurlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const copyCloudCurl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cloudCurlCommand);
      setCopiedCloudCurl(true);
      setTimeout(() => setCopiedCloudCurl(false), 2000);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (onUpdateWsUrl) {
      onUpdateWsUrl(localUrlInput);
    }
  };

  return (
    <footer className="w-full max-w-md mx-auto mt-6">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-red-50 transition-all duration-300">
        <div
          onClick={() => setShowDevPanel(!showDevPanel)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <Terminal className="w-4 h-4 text-[#E74C3C]" />
            <span>云端 WSS 地址说明、跨平台测试与 Webhook 命令</span>
          </div>
          <button
            type="button"
            className="p-1 text-gray-500 hover:text-gray-800 transition"
            aria-label="展开或收起调试说明"
          >
            {showDevPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showDevPanel && (
          <div className="mt-4 pt-4 border-t border-red-50 text-xs text-gray-600 space-y-4">
            {/* 云端 WSS 实时通道地址说明 */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Globe className="w-4 h-4 shrink-0 text-blue-600" />
                <span>关于云端 WSS 实时通道地址解析：</span>
              </div>
              <div className="text-[11px] font-mono break-all text-blue-800 bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                wss://ais-dev-qg27xsixd57abfoxwf5fav-665504981051.asia-east1.run.app/ws
              </div>
              <p className="text-[11px] leading-relaxed text-blue-900/90">
                <strong>这个地址是当前在线应用的「安全加密 WebSocket 实时广播通道」</strong>。当您在手机或电脑浏览器中打开该页面时，前端会自动向该地址发起持久长连接。外部系统或您的脚本只要调用下面的线上 Webhook 接口，该服务便会通过此 WSS 通道瞬间将响铃指令推送到您的设备。
              </p>
            </div>

            {/* 云端线上环境远程触发 curl */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  公网远程触发测试:
                </span>
                <button
                  type="button"
                  onClick={copyCloudCurl}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium transition cursor-pointer"
                >
                  {copiedCloudCurl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      已复制线上
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      复制线上命令
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-gray-900 text-blue-300 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre">
                {cloudCurlCommand}
              </pre>
            </div>

            {/* 本地环境 3001 curl 测试命令 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-[#E74C3C]" />
                  本机开发触发测试 (localhost:3001):
                </span>
                <button
                  type="button"
                  onClick={copyLocalCurl}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition cursor-pointer"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      已复制本地
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      复制本地命令
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre">
                {localCurlCommand}
              </pre>
            </div>

            {/* WebSocket 服务端配置 */}
            <form onSubmit={handleUpdate} className="flex items-center gap-2 pt-1">
              <label htmlFor="ws-url-input" className="shrink-0 font-medium text-gray-700">
                当前 WS:
              </label>
              <input
                id="ws-url-input"
                type="text"
                value={localUrlInput}
                onChange={(e) => setLocalUrlInput(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#E74C3C] text-white rounded-lg text-xs font-semibold hover:bg-[#C0392B] transition cursor-pointer"
              >
                重连
              </button>
            </form>
          </div>
        )}
      </div>
    </footer>
  );
}
