/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import Taro from '@tarojs/taro';

/**
 * 外部系统 Webhook 对接代码生成器模块
 * @param {object} props
 * @param {object | null} props.currentUser 当前登录用户
 */
export default function CodeGenPanel({ currentUser }) {
  const [codeLang, setCodeLang] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const token = currentUser?.webhookToken || 'dev-token';

  const codeSnippets = {
    curl: `curl -X POST ${protocol}//${host}/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${token}" \\
  -d '{
    "eventId": "evt-${Date.now().toString().slice(-6)}",
    "source": "外部系统监控",
    "message": "构建已完成，准备上线！",
    "durationMs": 4000,
    "sound": "ring"
  }'`,
    javascript: `// Node.js 或前端浏览器直接调用
async function triggerTomatoRing() {
  const response = await fetch('${protocol}//${host}/webhook/ring', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': '${token}'
    },
    body: JSON.stringify({
      eventId: 'evt-' + Date.now(),
      source: 'Node.js 自动化脚本',
      message: '测试环境部署完毕，请验收！',
      durationMs: 4000,
      sound: 'ring'
    })
  });
  const result = await response.json();
  console.log('响铃广播结果:', result);
}

triggerTomatoRing();`,
    python: `import requests
import time

url = "${protocol}//${host}/webhook/ring"
headers = {
    "Content-Type": "application/json",
    "X-Webhook-Token": "${token}"
}
payload = {
    "eventId": f"py-evt-{int(time.time())}",
    "source": "Python 监控守护进程",
    "message": "GPU 训练完成，热量消耗达标！",
    "durationMs": 5000,
    "sound": "focus-end"
}

response = requests.post(url, json=payload, headers=headers)
print("响铃响应:", response.status_code, response.json())`,
    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func main() {
	url := "${protocol}//${host}/webhook/ring"
	payload := map[string]interface{}{
		"eventId":    fmt.Sprintf("go-evt-%d", time.Now().Unix()),
		"source":     "Go Microservice",
		"message":    "系统健康检查告警：请及时排查！",
		"durationMs": 4000,
		"sound":      "ring",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Token", "${token}")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	fmt.Printf("Webhook 推送成功: %s\\n", resp.Status)
}`,
  };

  const handleCopyCode = async (text) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedCode(true);
      Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      Taro.showToast({ title: '复制失败，请手动选取', icon: 'none' });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-6 space-y-6">
      <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#E74C3C]" />
            <span>外部系统 Webhook 对接代码生成器</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            已自动填入当前登录用户的专属 Token 与当前服务地址，复制后即可直接运行
          </p>
        </div>

        {/* 语言切换标签 */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          {['curl', 'javascript', 'python', 'go'].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setCodeLang(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                codeLang === lang
                  ? 'bg-white text-[#E74C3C] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang === 'javascript' ? 'JavaScript / Node' : lang === 'go' ? 'Go 语言' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* 代码展示与复制区 */}
      <div className="relative group">
        <pre className="bg-gray-950 text-gray-100 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-gray-800">
          {codeSnippets[codeLang]}
        </pre>

        <button
          type="button"
          onClick={() => handleCopyCode(codeSnippets[codeLang])}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer border border-white/10"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCode ? '已复制' : '复制完整代码'}</span>
        </button>
      </div>

      {/* 接口文档速查卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E74C3C]" />
            <span>接口 URL</span>
          </div>
          <div className="text-xs font-mono font-bold text-[#E74C3C]">
            POST /webhook/ring
          </div>
          <div className="text-[11px] text-gray-500">
            支持端口 3000 (主服务) 与 3001 (独立服务) 均可调用
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>请求头鉴权</span>
          </div>
          <div className="text-xs font-mono font-bold text-gray-800 truncate" title={token}>
            X-Webhook-Token: {token}
          </div>
          <div className="text-[11px] text-gray-500">
            与 APP 账号密码同步绑定，独立隔离
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>内置特性</span>
          </div>
          <div className="text-xs font-bold text-gray-800">
            幂等去重 · 静音穿透 · 多端广播
          </div>
          <div className="text-[11px] text-gray-500">
            重复 eventId 自动过滤，iPhone 静音拨片音频强开
          </div>
        </div>
      </div>
    </div>
  );
}
