/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

/* 修改说明：本文件已移除本地 blacklistedWords 定义，转而导入 '@/lib/filter' 中的统一违禁词列表 */

import { NextRequest, NextResponse } from 'next/server';

import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { toSimplified } from '@/lib/chinese';
import { getAvailableApiSites, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';
import { blacklistedWords } from '@/lib/filter'; // 新增导入

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    // 违禁词检查
    if (blacklistedWords.some(word => query.toLowerCase().includes(word.toLowerCase()))) {
      return NextResponse.json({ suggestions: [] });
    }

    let normalizedQuery = query;
    try {
      normalizedQuery = await toSimplified(query);
    } catch (e) {
      console.warn('繁体转简体失败', e);
    }

    const suggestions = await generateSuggestions(
      config,
      normalizedQuery,
      authInfo.username
    );

    const cacheTime = config.SiteConfig.SiteInterfaceCacheTime || 300;

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  } catch (error) {
    console.error('获取搜索建议失败', error);
    return NextResponse.json({ error: '获取搜索建议失败' }, { status: 500 });
  }
}

// generateSuggestions 函数保持不变（省略，与原文件相同）
async function generateSuggestions(
  config: AdminConfig,
  query: string,
  username: string
): Promise<
  Array<{
    text: string;
    type: 'exact' | 'related' | 'suggestion';
    score: number;
  }>
> {
  const queryLower = query.toLowerCase();

  const apiSites = await getAvailableApiSites(username);
  let realKeywords: string[] = [];

  if (apiSites.length > 0) {
    const firstSite = apiSites[0];
    const results = await searchFromApi(firstSite, query);

    realKeywords = Array.from(
      new Set(
        results
          .filter((r: any) => {
            if (!config.SiteConfig.DisableYellowFilter) {
              if (firstSite.is_adult) return false;
              const typeName = r.type_name || '';
              if (yellowWords.some((word: string) => typeName.includes(word)))
                return false;
            }
            return true;
          })
          .map((r: any) => r.title)
          .filter(Boolean)
          .flatMap((title: string) => title.split(/[ -:：·、-]/))
          .filter(
            (w: string) => w.length > 1 && w.toLowerCase().includes(queryLower)
          )
      )
    ).slice(0, 8);
  }

  const realSuggestions = realKeywords.map((word) => {
    const wordLower = word.toLowerCase();
    const queryWords = queryLower.split(/[ -:：·、-]/);

    let score = 1.0;
    if (wordLower === queryLower) {
      score = 2.0;
    } else if (
      wordLower.startsWith(queryLower) ||
      wordLower.endsWith(queryLower)
    ) {
      score = 1.8;
    } else if (queryWords.some((qw) => wordLower.includes(qw))) {
      score = 1.5;
    }

    let type: 'exact' | 'related' | 'suggestion' = 'related';
    if (score >= 2.0) {
      type = 'exact';
    } else if (score >= 1.5) {
      type = 'related';
    } else {
      type = 'suggestion';
    }

    return { text: word, type, score };
  });

  const sortedSuggestions = realSuggestions.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    const typePriority = { exact: 3, related: 2, suggestion: 1 };
    return typePriority[b.type] - typePriority[a.type];
  });

  return sortedSuggestions;
}