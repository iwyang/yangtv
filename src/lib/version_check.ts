/* eslint-disable no-console */

'use client';

/**
 * 版本检测模块 - 混合策略实现
 *
 * 策略优先级：
 * 1. 首先尝试调用 /api/version/check API（最可靠，同源无 CORS 问题）
 * 2. 如果 API 失败，回退到客户端直接获取
 *
 * 时间戳格式: YYYYMMDDHHMMSS (14位数字)
 */

// 版本检查结果枚举
export enum UpdateStatus {
  CHECKING = 'checking', // 正在检测
  HAS_UPDATE = 'has_update', // 有新版本
  NO_UPDATE = 'no_update', // 已是最新版本
  FETCH_FAILED = 'fetch_failed', // 获取失败
}

// 远程版本源配置
const UPDATE_REPO = process.env.NEXT_PUBLIC_UPDATE_REPO || 'Decohererk/DecoTV';
const UPDATE_REF = process.env.NEXT_PUBLIC_UPDATE_REF || 'main';

// 多个镜像源，确保至少一个能访问
const REMOTE_VERSION_URLS = [
  // jsDelivr CDN (国际+国内加速，最稳定)
  `https://cdn.jsdelivr.net/gh/${UPDATE_REPO}@${UPDATE_REF}/VERSION.txt`,
  // Fastly jsDelivr
  `https://fastly.jsdelivr.net/gh/${UPDATE_REPO}@${UPDATE_REF}/VERSION.txt`,
  // GitHub Raw (国际)
  `https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_REF}/VERSION.txt`,
  // ghproxy 国内代理
  `https://ghproxy.net/https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_REF}/VERSION.txt`,
  // mirror.ghproxy
  `https://mirror.ghproxy.com/https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_REF}/VERSION.txt`,
];

const API_TIMEOUT = 5000; // API 超时 5 秒
const FETCH_TIMEOUT = 6000; // 远程获取超时 6 秒

export interface VersionCheckResult {
  status: UpdateStatus;
  localTimestamp?: string;
  remoteTimestamp?: string;
  formattedLocalTime?: string;
  formattedRemoteTime?: string;
  error?: string;
}

/**
 * 格式化时间戳为可读日期
 */
export function formatTimestamp(timestamp: string): string {
  if (!/^\d{14}$/.test(timestamp)) return timestamp;

  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(8, 10);
  const minute = timestamp.slice(10, 12);
  const second = timestamp.slice(12, 14);

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 验证时间戳格式是否正确 (14位数字)
 */
function isValidTimestamp(timestamp: string): boolean {
  return /^\d{14}$/.test(timestamp);
}

/**
 * 比较版本时间戳
 * @returns 正数: 本地更新, 0: 相同, 负数: 远程更新（有新版本）
 */
function compareTimestamps(local: string, remote: string): number {
  // 使用 BigInt 精确比较 14 位数字
  const localNum = BigInt(local);
  const remoteNum = BigInt(remote);

  if (localNum > remoteNum) return 1;
  if (localNum < remoteNum) return -1;
  return 0;
}

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 策略1: 通过 API 获取版本信息（推荐，同源无 CORS 问题）
 */
async function checkViaApi(): Promise<VersionCheckResult | null> {
  try {
    const response = await fetchWithTimeout(
      `/api/version/check?_t=${Date.now()}`,
      API_TIMEOUT
    );

    if (!response.ok) {
      console.warn('API 版本检测返回非 200:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.localTimestamp) {
      console.warn('API 返回数据无效:', data);
      return null;
    }

    // API 返回了完整的检测结果
    return {
      status: data.hasUpdate ? UpdateStatus.HAS_UPDATE : UpdateStatus.NO_UPDATE,
      localTimestamp: data.localTimestamp,
      remoteTimestamp: data.remoteTimestamp,
      formattedLocalTime: formatTimestamp(data.localTimestamp),
      formattedRemoteTime: data.remoteTimestamp
        ? formatTimestamp(data.remoteTimestamp)
        : undefined,
    };
  } catch (error) {
    console.warn('API 版本检测失败:', error);
    return null;
  }
}

/**
 * 获取远程版本时间戳 - 尝试多个镜像源
 */
async function fetchRemoteTimestamp(): Promise<string | null> {
  // 并行请求所有源，使用 Promise.race 获取最快的有效结果
  const fetchPromises = REMOTE_VERSION_URLS.map(async (url) => {
    try {
      const cacheBuster = `_t=${Date.now()}`;
      const urlWithCache = url.includes('?')
        ? `${url}&${cacheBuster}`
        : `${url}?${cacheBuster}`;

      const response = await fetchWithTimeout(urlWithCache, FETCH_TIMEOUT);
      if (!response.ok) return null;

      const text = (await response.text()).trim();
      if (isValidTimestamp(text)) {
        return text;
      }
      return null;
    } catch {
      return null;
    }
  });

  // 等待所有请求完成，返回第一个有效结果
  const results = await Promise.allSettled(fetchPromises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }

  return null;
}

/**
 * 获取本地版本时间戳
 */
async function fetchLocalTimestamp(): Promise<string | null> {
  // 尝试多个路径
  const paths = ['/VERSION.txt', './VERSION.txt'];

  for (const path of paths) {
    try {
      const response = await fetchWithTimeout(`${path}?_t=${Date.now()}`, 3000);
      if (response.ok) {
        const text = (await response.text()).trim();
        if (isValidTimestamp(text)) {
          return text;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * 策略2: 客户端直接获取并比较（回退方案）
 */
async function checkViaClientDirect(): Promise<VersionCheckResult> {
  try {
    // 并行获取本地和远程版本
    const [localTimestamp, remoteTimestamp] = await Promise.all([
      fetchLocalTimestamp(),
      fetchRemoteTimestamp(),
    ]);

    // 检查本地版本
    if (!localTimestamp) {
      console.error('无法获取本地版本时间戳');
      return {
        status: UpdateStatus.FETCH_FAILED,
        error: '无法读取本地版本信息',
      };
    }

    // 检查远程版本
    if (!remoteTimestamp) {
      console.error('无法获取远程版本时间戳');
      return {
        status: UpdateStatus.FETCH_FAILED,
        localTimestamp,
        formattedLocalTime: formatTimestamp(localTimestamp),
        error: '无法连接到更新服务器',
      };
    }

    // 比较版本
    const comparison = compareTimestamps(localTimestamp, remoteTimestamp);

    if (comparison < 0) {
      // 远程版本更新（远程时间戳更大 = 更新的版本）
      return {
        status: UpdateStatus.HAS_UPDATE,
        localTimestamp,
        remoteTimestamp,
        formattedLocalTime: formatTimestamp(localTimestamp),
        formattedRemoteTime: formatTimestamp(remoteTimestamp),
      };
    } else {
      // 本地版本相同或更新
      return {
        status: UpdateStatus.NO_UPDATE,
        localTimestamp,
        remoteTimestamp,
        formattedLocalTime: formatTimestamp(localTimestamp),
        formattedRemoteTime: formatTimestamp(remoteTimestamp),
      };
    }
  } catch (error) {
    console.error('客户端版本检测发生错误:', error);
    return {
      status: UpdateStatus.FETCH_FAILED,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 检查版本更新 - 主入口函数
 * 使用混合策略：优先 API，回退客户端直接获取
 */
export async function checkForUpdates(): Promise<VersionCheckResult> {
  // 策略1: 优先尝试 API（同源请求，最稳定）
  const apiResult = await checkViaApi();
  if (apiResult) {
    console.log('版本检测成功 (via API):', apiResult.status);
    return apiResult;
  }

  // 策略2: API 失败，回退到客户端直接获取
  console.log('API 检测失败，尝试客户端直接获取...');
  const clientResult = await checkViaClientDirect();
  console.log('版本检测结果 (via Client):', clientResult.status);
  return clientResult;
}
