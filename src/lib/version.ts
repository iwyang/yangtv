/**
 * 版本检测和管理工具（已禁用更新检测）
 * 版本号格式: YYYYMMDDHHMMSS (年月日时分秒)
 */

// 版本常量
const CURRENT_SEMANTIC_VERSION = '0.8.0';
export const CURRENT_VERSION = CURRENT_SEMANTIC_VERSION;

// 硬编码的构建时间戳（每次发布时可更新，作为最终回退）
export const BUILD_TIMESTAMP = '20251215235531';

export interface VersionInfo {
  version: string; // package.json 版本 (如 "0.8.0")
  timestamp: string; // 时间戳版本 (如 "20251215235531")
  buildTime: Date; // 构建时间
  isLatest: boolean; // 是否为最新版本（固定为 true）
  updateAvailable: boolean; // 是否有更新可用（固定为 false）
  displayVersion: string; // 显示版本 (如 "v0.8.0")
}

/**
 * 解析时间戳版本号
 */
export function parseVersionTimestamp(timestamp: string): Date | null {
  if (!/^\d{14}$/.test(timestamp)) {
    return null;
  }

  const year = parseInt(timestamp.slice(0, 4));
  const month = parseInt(timestamp.slice(4, 6)) - 1; // JS 月份从0开始
  const day = parseInt(timestamp.slice(6, 8));
  const hour = parseInt(timestamp.slice(8, 10));
  const minute = parseInt(timestamp.slice(10, 12));
  const second = parseInt(timestamp.slice(12, 14));

  const date = new Date(year, month, day, hour, minute, second);

  // 验证日期是否有效
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 格式化版本时间戳为可读格式
 */
export function formatVersionTimestamp(timestamp: string): string {
  const date = parseVersionTimestamp(timestamp);
  if (!date) return timestamp;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 生成当前时间戳版本号（供构建时使用）
 */
export function generateVersionTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * 获取当前版本信息（仅读取本地 VERSION.txt，不进行远程检测）
 */
export async function getCurrentVersionInfo(): Promise<VersionInfo> {
  try {
    // 尝试读取部署后的 VERSION.txt 文件
    const response = await fetch('/VERSION.txt?_t=' + Date.now());
    if (response.ok) {
      const timestamp = (await response.text()).trim();
      const buildTime = parseVersionTimestamp(timestamp) || new Date();

      return {
        version: CURRENT_VERSION,
        timestamp,
        buildTime,
        isLatest: true,
        updateAvailable: false,
        displayVersion: `v${CURRENT_VERSION}`,
      };
    }
  } catch (error) {
    // 静默降级
  }

  // 最终回退：使用硬编码时间戳
  const timestamp = BUILD_TIMESTAMP;
  return {
    version: CURRENT_VERSION,
    timestamp,
    buildTime: parseVersionTimestamp(timestamp) || new Date(),
    isLatest: true,
    updateAvailable: false,
    displayVersion: `v${CURRENT_VERSION}`,
  };
}

/**
 * 检查是否有新版本可用
 * 已永久禁用更新检测，永远返回无更新
 */
export async function checkForUpdates(currentTimestamp?: string): Promise<{
  hasUpdate: boolean;
  checkFailed?: boolean;
}> {
  return {
    hasUpdate: false,
    checkFailed: false,
  };
}

/**
 * 获取版本状态文本和颜色（永远显示已是最新版本）
 */
export function getVersionStatusInfo(versionInfo: VersionInfo) {
  return {
    text: '当前已是最新版本',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: '✅',
  };
}

// CURRENT_VERSION 已在文件顶部导出