/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

/* 修改说明：本文件已移除本地 blacklistedWords 定义，转而导入 '@/lib/filter' 中的统一违禁词列表 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { toSimplified } from '@/lib/chinese';
import { getAvailableApiSites, getConfig } from '@/lib/config';
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
    return new Response(JSON.stringify({ error: '搜索关键词不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 违禁词检查
  if (blacklistedWords.some(word => query.toLowerCase().includes(word.toLowerCase()))) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const emptyEvent = `data: ${JSON.stringify({
          type: 'complete',
          totalResults: 0,
          completedSources: 0,
          timestamp: Date.now(),
        })}\n\n`;
        controller.enqueue(encoder.encode(emptyEvent));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  let normalizedQuery = query;
  try {
    if (query) {
      normalizedQuery = await toSimplified(query);
    }
  } catch (e) {
    console.warn('繁体转简体失败', e);
  }

  const searchQueries = [normalizedQuery];
  if (query && normalizedQuery !== query) {
    searchQueries.push(query);
  }

  let streamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (streamClosed || (!controller.desiredSize && controller.desiredSize !== 0)) {
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch (error) {
          console.warn('Failed to enqueue data:', error);
          streamClosed = true;
          return false;
        }
      };

      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        query,
        normalizedQuery,
        totalSources: apiSites.length,
        timestamp: Date.now(),
      })}\n\n`;

      if (!safeEnqueue(encoder.encode(startEvent))) return;

      let completedSources = 0;
      const allResults: any[] = [];

      const searchPromises = apiSites.map(async (site) => {
        try {
          const siteResultsPromises = searchQueries.map((q) =>
            Promise.race([
              searchFromApi(site, q),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
              ),
            ]).catch((err) => {
              console.warn(`搜索失败 ${site.name} (query: ${q}):`, err.message);
              return [];
            })
          );

          const resultsArrays = await Promise.all(siteResultsPromises);
          let results = resultsArrays.flat() as any[];
          const uniqueMap = new Map();
          results.forEach((r) => uniqueMap.set(r.id, r));
          results = Array.from(uniqueMap.values());

          let filteredResults = results;
          if (!config.SiteConfig.DisableYellowFilter) {
            filteredResults = results.filter((result) => {
              const typeName = result.type_name || '';
              if (site.is_adult) return false;
              return !yellowWords.some((word: string) => typeName.includes(word));
            });
          }

          filteredResults = rankSearchResults(filteredResults, normalizedQuery);

          completedSources++;

          if (!streamClosed) {
            const sourceEvent = `data: ${JSON.stringify({
              type: 'source_result',
              source: site.key,
              sourceName: site.name,
              results: filteredResults,
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(sourceEvent))) {
              streamClosed = true;
              return;
            }
          }

          if (filteredResults.length > 0) {
            allResults.push(...filteredResults);
          }
        } catch (error) {
          console.warn(`搜索失败 ${site.name}:`, error);
          completedSources++;

          if (!streamClosed) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'source_error',
              source: site.key,
              sourceName: site.name,
              error: error instanceof Error ? error.message : '搜索失败',
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(errorEvent))) {
              streamClosed = true;
              return;
            }
          }
        }

        if (completedSources === apiSites.length) {
          if (!streamClosed) {
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete',
              totalResults: allResults.length,
              completedSources,
              timestamp: Date.now(),
            })}\n\n`;

            if (safeEnqueue(encoder.encode(completeEvent))) {
              try {
                controller.close();
              } catch (error) {
                console.warn('Failed to close controller:', error);
              }
            }
          }
        }
      });

      await Promise.allSettled(searchPromises);
    },

    cancel() {
      streamClosed = true;
      console.log('Client disconnected, cancelling search stream');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}