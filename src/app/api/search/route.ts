/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

/* 修改说明：本文件已移除本地 blacklistedWords 定义，转而导入 '@/lib/filter' 中的统一违禁词列表 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { toSimplified } from '@/lib/chinese';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { rankSearchResults } from '@/lib/search-ranking';
import { yellowWords } from '@/lib/yellow';
import { blacklistedWords } from '@/lib/filter'; // 新增导入

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

  // 违禁词检查：包含任意违禁词直接返回空结果
  if (blacklistedWords.some(word => query.toLowerCase().includes(word.toLowerCase()))) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  // 🔒 成人内容过滤逻辑
  const adultParam = searchParams.get('adult');
  const filterParam = searchParams.get('filter');

  let shouldFilterAdult = !config.SiteConfig.DisableYellowFilter;

  if (adultParam === '1' || adultParam === 'true') {
    shouldFilterAdult = false;
  } else if (adultParam === '0' || adultParam === 'false') {
    shouldFilterAdult = true;
  } else if (filterParam === 'off' || filterParam === 'disable') {
    shouldFilterAdult = false;
  } else if (filterParam === 'on' || filterParam === 'enable') {
    shouldFilterAdult = true;
  }

  let normalizedQuery = query;
  try {
    if (query) {
      normalizedQuery = await toSimplified(query);
    }
  } catch (e) {
    console.warn('繁体转简体失败，使用原始关键词', (e as any)?.message || e);
    normalizedQuery = query;
  }

  const searchQueries = [normalizedQuery];
  if (query && normalizedQuery !== query) {
    searchQueries.push(query);
  }

  const searchPromises = apiSites.flatMap((site) =>
    searchQueries.map((q) =>
      Promise.race([
        searchFromApi(site, q),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
        ),
      ]).catch((err) => {
        console.warn(`搜索失败 ${site.name} (query: ${q}):`, err.message);
        return [];
      })
    )
  );

  try {
    const results = await Promise.allSettled(searchPromises);
    const successResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    let flattenedResults = successResults.flat();

    const uniqueResultsMap = new Map<string, any>();
    flattenedResults.forEach((item) => {
      const key = `${item.source}|${item.id}`;
      if (!uniqueResultsMap.has(key)) {
        uniqueResultsMap.set(key, item);
      }
    });
    flattenedResults = Array.from(uniqueResultsMap.values());

    if (shouldFilterAdult) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        const sourceKey = result.source_key || '';
        const source = apiSites.find((s) => s.key === sourceKey);
        if (source && source.is_adult) {
          return false;
        }
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }

    flattenedResults = rankSearchResults(
      flattenedResults,
      normalizedQuery || query
    );

    const cacheTime = await getCacheTime();

    if (flattenedResults.length === 0) {
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
          'X-Adult-Filter': shouldFilterAdult ? 'enabled' : 'disabled',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}