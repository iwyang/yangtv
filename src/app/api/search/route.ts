// Modified file: route.ts
/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { toSimplified } from '@/lib/chinese';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { rankSearchResults } from '@/lib/search-ranking';
import { yellowWords } from '@/lib/yellow';
import { bannedWords } from '@/lib/filter'; // 新增导入

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  }

  // 新增: 检查查询是否包含违禁词
  if (bannedWords.some((word: string) => query.toLowerCase().includes(word.toLowerCase()))) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  // 🔒 成人内容过滤逻辑
  // URL 参数优先级: ?adult=1 (显示成人) > ?filter=off (显示成人) > 全局配置
  const adultParam = searchParams.get('adult'); // OrionTV 风格参数
  const filterParam = searchParams.get('filter'); // TVBox 风格参数

  let shouldFilterAdult = !config.SiteConfig.DisableYellowFilter; // 默认使用全局配置

  // URL 参数覆盖全局配置
  if (adultParam === '1' || adultParam === 'true') {
    shouldFilterAdult = false; // 显式启用成人内容
  } else if (adultParam === '0' || adultParam === 'false') {
    shouldFilterAdult = true; // 显式禁用成人内容
  } else if (filterParam === 'off' || filterParam === 'disable') {
    shouldFilterAdult = false; // 禁用过滤 = 显示成人内容
  } else if (filterParam === 'on' || filterParam === 'enable') {
    shouldFilterAdult = true; // 启用过滤 = 隐藏成人内容
  }

  // 将搜索关键词规范化为简体中文，提升繁体用户搜索体验
  let normalizedQuery = query;
  try {
    if (query) {
      normalizedQuery = await toSimplified(query);
    }
  } catch (e) {
    console.warn('繁体转简体失败，使用原始关键词', (e as any)?.message || e);
    normalizedQuery = query;
  }

  // 准备搜索关键词列表：如果转换后的关键词与原词不同，则同时搜索两者
  // 准备搜索关键词列表
  const searchQueries = [normalizedQuery];
  
  // ✨ 新增：处理冒号逻辑 (去冒号、副标题提取)
  const colonRegex = /[:：]/;
  if (colonRegex.test(normalizedQuery)) {
    const parts = normalizedQuery.split(colonRegex).map(p => p.trim());
    if (parts.length >= 2) {
      const mainTitle = parts[0];
      const subTitle = parts[1];

      // 1. 添加空格分隔版本 (例如: "凡人修仙传 仙界篇")
      const spaced = `${mainTitle} ${subTitle}`;
      if (!searchQueries.includes(spaced)) searchQueries.push(spaced);

      // 2. 添加紧密连接版本 (例如: "凡人修仙传仙界篇")
      const combined = `${mainTitle}${subTitle}`;
      if (!searchQueries.includes(combined)) searchQueries.push(combined);

      // 3. 添加仅副标题 (如果长度 >= 2)
      if (subTitle.length >= 2 && !searchQueries.includes(subTitle)) {
        searchQueries.push(subTitle);
      }

      // 4. 符号互换版本 (如果是中文冒号则补一个英文冒号版，反之亦然)
      const swapped = normalizedQuery.includes(':') 
        ? normalizedQuery.replace(':', '：') 
        : normalizedQuery.replace('：', ':');
      if (!searchQueries.includes(swapped)) searchQueries.push(swapped);
    }
  }
  
  // 1.新增：处理“第n季/部”自动加空格逻辑，支持从“剑来第二季”生成“剑来 第二季”
  const seasonRegex = /(.+?)(第[0-9一二三四五六七八九十]+[季部])/;
  const match = normalizedQuery.match(seasonRegex);
  if (match && !normalizedQuery.includes(' ')) {
    searchQueries.push(`${match[1]} ${match[2]}`);
  }
  
  // 2.优化后的篇章拆分逻辑：针对特定篇章名进行锚定
  // 匹配原理：(作品名)(篇章关键字)(篇)
  const knownArcs = '无限列车|游郭|锻刀村|刀匠村|柱训练|无限城|立志|篇章';
  const arcPattern = new RegExp(`(.+?)((${knownArcs})篇)$`);
  const arcMatch = normalizedQuery.match(arcPattern);

  if (arcMatch && !normalizedQuery.includes(' ')) {
    const mainTitle = arcMatch[1]; // 结果：鬼灭之刃
    const arcName = arcMatch[2];   // 结果：柱训练篇
  
    // 确保主标题有意义（长度 >= 2），避免拆分单字
    if (mainTitle.length >= 2) {
      const arcSpaced = `${mainTitle} ${arcName}`;
      if (!searchQueries.includes(arcSpaced)) {
        searchQueries.push(arcSpaced);
      }
    }
  }
  
  //3.新增：后缀剥离与前缀提取逻辑
  // 匹配：(核心主标题) + (年份/语言/版本后缀)
  const metaSuffixRegex = /(.+?)((?:\(|（)?(?:国语|粤语|普通话|原声|双语|动画|动漫)(?:版)?(?:\)|）)?|(?:\(|（)?\d{4}年?(?:\)|）)?)$/;
  const metaMatch = normalizedQuery.match(metaSuffixRegex);

  if (metaMatch) {
    const coreTitle = metaMatch[1].trim(); // 得到：捕风追影
    if (coreTitle.length >= 2 && !searchQueries.includes(coreTitle)) {
      searchQueries.push(coreTitle); // 将最核心的词加入搜索，以获取所有相关结果
    }
  }

  const collapsedQuery = normalizedQuery.replace(/\s+/g, '');
  if (collapsedQuery !== normalizedQuery && !searchQueries.includes(collapsedQuery)) {
    searchQueries.push(collapsedQuery);
  }

  if (query && normalizedQuery !== query) {
    searchQueries.push(query);
    
    // 对原始查询也进行同样的“第n季/部”处理
    const originMatch = query.match(seasonRegex);
    if (originMatch && !query.includes(' ')) {
      const spacedOrigin = `${originMatch[1]} ${originMatch[2]}`;
      if (!searchQueries.includes(spacedOrigin)) {
        searchQueries.push(spacedOrigin);
      }
    }
    
    const collapsedOriginal = query.replace(/\s+/g, '');
    if (collapsedOriginal !== query && collapsedOriginal !== collapsedQuery) {
      searchQueries.push(collapsedOriginal);
    }
  }

  // 添加超时控制和错误处理，避免慢接口拖累整体响应
  // 对每个站点，尝试搜索所有关键词
  const searchPromises = apiSites.flatMap((site) =>
    searchQueries.map((q) =>
      Promise.race([
        searchFromApi(site, q),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
        ),
      ]).catch((err) => {
        console.warn(`搜索失败 ${site.name} (query: ${q}):`, err.message);
        return []; // 返回空数组而不是抛出错误
      })
    )
  );

  try {
    const results = await Promise.allSettled(searchPromises);
    const successResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    let flattenedResults = successResults.flat();

    // 去重：根据 source 和 id 去重
    const uniqueResultsMap = new Map<string, any>();
    flattenedResults.forEach((item) => {
      const key = `${item.source}|${item.id}`;
      if (!uniqueResultsMap.has(key)) {
        uniqueResultsMap.set(key, item);
      }
    });
    flattenedResults = Array.from(uniqueResultsMap.values());

    // 新增: 过滤结果中的违禁词
    flattenedResults = flattenedResults.filter((result) => {
      const title = result.title || '';
      const typeName = result.type_name || '';
      return !bannedWords.some((word: string) => title.includes(word) || typeName.includes(word));
    });

    // 🔒 成人内容过滤逻辑
    // shouldFilterAdult=true 表示启用过滤(过滤成人内容)
    // shouldFilterAdult=false 表示禁用过滤(显示所有内容)
    if (shouldFilterAdult) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        const sourceKey = result.source_key || '';

        // 检查视频源是否标记为成人资源
        const source = apiSites.find((s) => s.key === sourceKey);
        if (source && source.is_adult) {
          return false; // 过滤掉标记为成人资源的源
        }

        // 检查分类名称是否包含敏感关键词
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }

    // 🎯 智能排序：按相关性对搜索结果排序（使用规范化关键词）
    flattenedResults = rankSearchResults(
      flattenedResults,
      normalizedQuery || query
    );

    const cacheTime = await getCacheTime();

    if (flattenedResults.length === 0) {
      // no cache if empty
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    return NextResponse.json(
      { results: flattenedResults, normalizedQuery },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
          'X-Adult-Filter': shouldFilterAdult ? 'enabled' : 'disabled', // 调试信息
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}