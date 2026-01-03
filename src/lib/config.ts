/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

import { db } from '@/lib/db';

import { AdminConfig } from './admin.types';

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
  is_adult?: boolean; // 标记是否为成人资源
}

export interface LiveCfg {
  name: string;
  url: string;
  ua?: string;
  epg?: string; // 节目单
}

interface ConfigFileStruct {
  cache_time?: number;
  api_site?: {
    [key: string]: ApiSite;
  };
  custom_category?: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
  }[];
  lives?: {
    [key: string]: LiveCfg;
  };
}

export const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=',
    pagePath: '?ac=videolist&wd={query}&pg={page}',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
};

// 在模块加载时根据环境决定配置来源
let cachedConfig: AdminConfig;

// 从配置文件补充管理员配置
export function refineConfig(adminConfig: AdminConfig): AdminConfig {
  let fileConfig: ConfigFileStruct;
  try {
    fileConfig = JSON.parse(adminConfig.ConfigFile) as ConfigFileStruct;
  } catch (e) {
    fileConfig = {} as ConfigFileStruct;
  }

  // 合并文件中的源信息
  const apiSitesFromFile = Object.entries(fileConfig.api_site || []);
  const currentApiSites = new Map(
    (adminConfig.SourceConfig || []).map((s) => [s.key, s])
  );

  apiSitesFromFile.forEach(([key, site]) => {
    const existingSource = currentApiSites.get(key);
    if (existingSource) {
      // 如果已存在,只覆盖 name、api、detail、is_adult 和 from
      existingSource.name = site.name;
      existingSource.api = site.api;
      existingSource.detail = site.detail;
      existingSource.is_adult = site.is_adult || false;
      existingSource.from = 'config';
    } else {
      // 如果不存在,创建新条目
      currentApiSites.set(key, {
        key,
        name: site.name,
        api: site.api,
        detail: site.detail,
        is_adult: site.is_adult || false,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有源是否在 fileConfig.api_site 中，如果不在则标记为 custom
  const apiSitesFromFileKey = new Set(apiSitesFromFile.map(([key]) => key));
  currentApiSites.forEach((source) => {
    if (!apiSitesFromFileKey.has(source.key)) {
      source.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.SourceConfig = Array.from(currentApiSites.values());

  // 覆盖 CustomCategories
  const customCategoriesFromFile = fileConfig.custom_category || [];
  const currentCustomCategories = new Map(
    (adminConfig.CustomCategories || []).map((c) => [c.query + c.type, c])
  );

  customCategoriesFromFile.forEach((category) => {
    const key = category.query + category.type;
    const existedCategory = currentCustomCategories.get(key);
    if (existedCategory) {
      existedCategory.name = category.name;
      existedCategory.query = category.query;
      existedCategory.type = category.type;
      existedCategory.from = 'config';
    } else {
      currentCustomCategories.set(key, {
        name: category.name,
        type: category.type,
        query: category.query,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 CustomCategories 是否在 fileConfig.custom_category 中，如果不在则标记为 custom
  const customCategoriesFromFileKeys = new Set(
    customCategoriesFromFile.map((c) => c.query + c.type)
  );
  currentCustomCategories.forEach((category) => {
    if (!customCategoriesFromFileKeys.has(category.query + category.type)) {
      category.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.CustomCategories = Array.from(currentCustomCategories.values());

  const livesFromFile = Object.entries(fileConfig.lives || []);
  const currentLives = new Map(
    (adminConfig.LiveConfig || []).map((l) => [l.key, l])
  );
  livesFromFile.forEach(([key, site]) => {
    const existingLive = currentLives.get(key);
    if (existingLive) {
      existingLive.name = site.name;
      existingLive.url = site.url;
      existingLive.ua = site.ua;
      existingLive.epg = site.epg;
    } else {
      // 如果不存在，创建新条目
      currentLives.set(key, {
        key,
        name: site.name,
        url: site.url,
        ua: site.ua,
        epg: site.epg,
        channelNumber: 0,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 LiveConfig 是否在 fileConfig.lives 中，如果不在则标记为 custom
  const livesFromFileKeys = new Set(livesFromFile.map(([key]) => key));
  currentLives.forEach((live) => {
    if (!livesFromFileKeys.has(live.key)) {
      live.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.LiveConfig = Array.from(currentLives.values());

  return adminConfig;
}

async function getInitConfig(
  configFile: string,
  subConfig: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  } = {
    URL: '',
    AutoUpdate: false,
    LastCheck: '',
  }
): Promise<AdminConfig> {
  let cfgFile: ConfigFileStruct;
  try {
    cfgFile = JSON.parse(configFile) as ConfigFileStruct;
  } catch (e) {
    cfgFile = {} as ConfigFileStruct;
  }
  const adminConfig: AdminConfig = {
    ConfigFile: configFile,
    ConfigSubscribtion: subConfig,
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'DecoTV',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: cfgFile.cache_time || 7200,
      DoubanProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent',
      DoubanProxy: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
      DoubanImageProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-tencent',
      DoubanImageProxy: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
      DisableYellowFilter:
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
    },
    UserConfig: {
      Users: [],
    },
    SourceConfig: [],
    CustomCategories: [],
    LiveConfig: [],
  };

  // 补充用户信息
  let userNames: string[] = [];
  try {
    userNames = await db.getAllUsers();
  } catch (e) {
    console.error('获取用户列表失败:', e);
  }
  const allUsers = userNames
    .filter((u) => u !== process.env.USERNAME)
    .map((u) => ({
      username: u,
      role: 'user',
      banned: false,
    }));
  allUsers.unshift({
    username: process.env.USERNAME!,
    role: 'owner',
    banned: false,
  });
  adminConfig.UserConfig.Users = allUsers as any;

  // 从配置文件中补充源信息
  Object.entries(cfgFile.api_site || []).forEach(([key, site]) => {
    adminConfig.SourceConfig.push({
      key: key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      is_adult: site.is_adult || false,
      from: 'config',
      disabled: false,
    });
  });

  // 从配置文件中补充自定义分类信息
  cfgFile.custom_category?.forEach((category) => {
    adminConfig.CustomCategories.push({
      name: category.name || category.query,
      type: category.type,
      query: category.query,
      from: 'config',
      disabled: false,
    });
  });

  // 从配置文件中补充直播源信息
  Object.entries(cfgFile.lives || []).forEach(([key, live]) => {
    if (!adminConfig.LiveConfig) {
      adminConfig.LiveConfig = [];
    }
    adminConfig.LiveConfig.push({
      key,
      name: live.name,
      url: live.url,
      ua: live.ua,
      epg: live.epg,
      channelNumber: 0,
      from: 'config',
      disabled: false,
    });
  });

  return adminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  // 直接使用内存缓存
  if (cachedConfig) {
    return cachedConfig;
  }

  // 读 db
  let adminConfig: AdminConfig | null = null;
  try {
    adminConfig = await db.getAdminConfig();
  } catch (e) {
    console.error('获取管理员配置失败:', e);
  }

  // db 中无配置，执行一次初始化
  if (!adminConfig) {
    adminConfig = await getInitConfig('');
  }
  adminConfig = configSelfCheck(adminConfig);
  cachedConfig = adminConfig;
  // 🐛 修复: 确保配置保存完成后再返回
  await db.saveAdminConfig(cachedConfig);
  return cachedConfig;
}

export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  // 确保必要的属性存在和初始化
  if (!adminConfig.UserConfig) {
    adminConfig.UserConfig = { Users: [] };
  }
  if (
    !adminConfig.UserConfig.Users ||
    !Array.isArray(adminConfig.UserConfig.Users)
  ) {
    adminConfig.UserConfig.Users = [];
  }
  if (!adminConfig.SourceConfig || !Array.isArray(adminConfig.SourceConfig)) {
    adminConfig.SourceConfig = [];
  }
  if (
    !adminConfig.CustomCategories ||
    !Array.isArray(adminConfig.CustomCategories)
  ) {
    adminConfig.CustomCategories = [];
  }
  if (!adminConfig.LiveConfig || !Array.isArray(adminConfig.LiveConfig)) {
    adminConfig.LiveConfig = [];
  }

  // 站长变更自检
  const ownerUser = process.env.USERNAME;

  // 去重
  const seenUsernames = new Set<string>();
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter((user) => {
    if (seenUsernames.has(user.username)) {
      return false;
    }
    seenUsernames.add(user.username);
    return true;
  });
  // 过滤站长
  const originOwnerCfg = adminConfig.UserConfig.Users.find(
    (u) => u.username === ownerUser
  );
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter(
    (user) => user.username !== ownerUser
  );
  // 其他用户不得拥有 owner 权限
  adminConfig.UserConfig.Users.forEach((user) => {
    if (user.role === 'owner') {
      user.role = 'user';
    }
  });
  // 重新添加回站长
  adminConfig.UserConfig.Users.unshift({
    username: ownerUser!,
    role: 'owner',
    banned: false,
    enabledApis: originOwnerCfg?.enabledApis || undefined,
    tags: originOwnerCfg?.tags || undefined,
  });

  // 采集源去重
  const seenSourceKeys = new Set<string>();
  adminConfig.SourceConfig = adminConfig.SourceConfig.filter((source) => {
    if (seenSourceKeys.has(source.key)) {
      return false;
    }
    seenSourceKeys.add(source.key);
    return true;
  });

  // 自定义分类去重
  const seenCustomCategoryKeys = new Set<string>();
  adminConfig.CustomCategories = adminConfig.CustomCategories.filter(
    (category) => {
      if (seenCustomCategoryKeys.has(category.query + category.type)) {
        return false;
      }
      seenCustomCategoryKeys.add(category.query + category.type);
      return true;
    }
  );

  // 直播源去重
  const seenLiveKeys = new Set<string>();
  adminConfig.LiveConfig = adminConfig.LiveConfig.filter((live) => {
    if (seenLiveKeys.has(live.key)) {
      return false;
    }
    seenLiveKeys.add(live.key);
    return true;
  });

  return adminConfig;
}

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await db.getAdminConfig();
  } catch (e) {
    console.error('获取管理员配置失败:', e);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion
  );
  cachedConfig = adminConfig;
  await db.saveAdminConfig(adminConfig);

  return;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

export async function getAvailableApiSites(user?: string): Promise<ApiSite[]> {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s) => !s.disabled);

  if (!user) {
    return allApiSites;
  }

  const userConfig = config.UserConfig.Users.find((u) => u.username === user);
  if (!userConfig) {
    return allApiSites;
  }

  // 优先根据用户自己的 enabledApis 配置查找
  if (userConfig.enabledApis && userConfig.enabledApis.length > 0) {
    const userApiSitesSet = new Set(userConfig.enabledApis);
    return allApiSites
      .filter((s) => userApiSitesSet.has(s.key))
      .map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        detail: s.detail,
        is_adult: s.is_adult,
      }));
  }

  // 如果没有 enabledApis 配置，则根据 tags 查找
  if (userConfig.tags && userConfig.tags.length > 0 && config.UserConfig.Tags) {
    const enabledApisFromTags = new Set<string>();

    // 遍历用户的所有 tags，收集对应的 enabledApis
    userConfig.tags.forEach((tagName) => {
      const tagConfig = config.UserConfig.Tags?.find((t) => t.name === tagName);
      if (tagConfig && tagConfig.enabledApis) {
        tagConfig.enabledApis.forEach((apiKey) =>
          enabledApisFromTags.add(apiKey)
        );
      }
    });

    if (enabledApisFromTags.size > 0) {
      return allApiSites
        .filter((s) => enabledApisFromTags.has(s.key))
        .map((s) => ({
          key: s.key,
          name: s.name,
          api: s.api,
          detail: s.detail,
          is_adult: s.is_adult,
        }));
    }
  }

  // 如果都没有配置，返回所有可用的 API 站点
  return allApiSites;
}

export async function setCachedConfig(config: AdminConfig) {
  cachedConfig = config;
}
