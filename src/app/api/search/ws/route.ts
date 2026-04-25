// Modified file: ws.route.ts
/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { toSimplified } from '@/lib/chinese';
import { getAvailableApiSites, getConfig } from '@/lib/config';
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
    return new Response(JSON.stringify({ error: '搜索关键词不能为空' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // 新增: 检查查询是否包含违禁词
  if (bannedWords.some((word: string) => query.toLowerCase().includes(word.toLowerCase()))) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const startEvent = `data: ${JSON.stringify({
          type: 'start',
          query,
          normalizedQuery: query,
          totalSources: 0,
          timestamp: Date.now(),
        })}\n\n`;
        controller.enqueue(encoder.encode(startEvent));

        const completeEvent = `data: ${JSON.stringify({
          type: 'complete',
          totalResults: 0,
          completedSources: 0,
          timestamp: Date.now(),
        })}\n\n`;
        controller.enqueue(encoder.encode(completeEvent));
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

  // 将搜索关键词规范化为简体中文
  let normalizedQuery = query;
  try {
    if (query) {
      normalizedQuery = await toSimplified(query);
    }
  } catch (e) {
    console.warn('繁体转简体失败', e);
  }

  // 准备搜索关键词列表
  // 准备搜索关键词列表
  const searchQueries = [normalizedQuery];
  
  // ✨ 新增：处理冒号逻辑
  const colonRegex = /[:：]/;
  if (colonRegex.test(normalizedQuery)) {
    const parts = normalizedQuery.split(colonRegex).map(p => p.trim());
    if (parts.length >= 2) {
      const mainTitle = parts[0];
      const subTitle = parts[1];
      
      const spaced = `${mainTitle} ${subTitle}`;
      if (!searchQueries.includes(spaced)) searchQueries.push(spaced);

      const combined = `${mainTitle}${subTitle}`;
      if (!searchQueries.includes(combined)) searchQueries.push(combined);

      if (subTitle.length >= 2 && !searchQueries.includes(subTitle)) {
        searchQueries.push(subTitle);
      }

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

  // 共享状态
  let streamClosed = false;

  // 创建可读流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 辅助函数：安全地向控制器写入数据
      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (
            streamClosed ||
            (!controller.desiredSize && controller.desiredSize !== 0)
          ) {
            // 流已标记为关闭或控制器已关闭
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch (error) {
          // 控制器已关闭或出现其他错误
          console.warn('Failed to enqueue data:', error);
          streamClosed = true;
          return false;
        }
      };

      // 发送开始事件
      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        query,
        normalizedQuery,
        totalSources: apiSites.length,
        timestamp: Date.now(),
      })}\n\n`;

      if (!safeEnqueue(encoder.encode(startEvent))) {
        return; // 连接已关闭，提前退出
      }

      // 记录已完成的源数量
      let completedSources = 0;
      const allResults: any[] = [];

      // 为每个源创建搜索 Promise
      const searchPromises = apiSites.map(async (site) => {
        try {
          // 对每个站点，尝试搜索所有关键词
          const siteResultsPromises = searchQueries.map((q) =>
            Promise.race([
              searchFromApi(site, q),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`${site.name} timeout`)),
                  20000
                )
              ),
            ]).catch((err) => {
              console.warn(`搜索失败 ${site.name} (query: ${q}):`, err.message);
              return [];
            })
          );

          const resultsArrays = await Promise.all(siteResultsPromises);
          // 展平并去重
          let results = resultsArrays.flat() as any[];
          const uniqueMap = new Map();
          results.forEach((r) => uniqueMap.set(r.id, r));
          results = Array.from(uniqueMap.values());

          // 新增: 过滤结果中的违禁词
          let filteredResults = results.filter((result) => {
            const title = result.title || '';
            const typeName = result.type_name || '';
            return !bannedWords.some((word: string) => title.includes(word) || typeName.includes(word));
          });

          // 成人内容过滤
          if (!config.SiteConfig.DisableYellowFilter) {
            filteredResults = filteredResults.filter((result) => {
              const typeName = result.type_name || '';
              // 检查源是否标记为成人资源
              if (site.is_adult) {
                return false;
              }
              // 检查分类名称关键词
              return !yellowWords.some((word: string) =>
                typeName.includes(word)
              );
            });
          }

          // 🎯 智能排序：按相关性对该源的结果排序
          filteredResults = rankSearchResults(filteredResults, normalizedQuery);

          // 发送该源的搜索结果
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
              return; // 连接已关闭，停止处理
            }
          }

          if (filteredResults.length > 0) {
            allResults.push(...filteredResults);
          }
        } catch (error) {
          console.warn(`搜索失败 ${site.name}:`, error);

          // 发送源错误事件
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
              return; // 连接已关闭，停止处理
            }
          }
        }

        // 检查是否所有源都已完成
        if (completedSources === apiSites.length) {
          if (!streamClosed) {
            // 发送最终完成事件
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete',
              totalResults: allResults.length,
              completedSources,
              timestamp: Date.now(),
            })}\n\n`;

            if (safeEnqueue(encoder.encode(completeEvent))) {
              // 只有在成功发送完成事件后才关闭流
              try {
                controller.close();
              } catch (error) {
                console.warn('Failed to close controller:', error);
              }
            }
          }
        }
      });

      // 等待所有搜索完成
      await Promise.allSettled(searchPromises);
    },

    cancel() {
      // 客户端断开连接时，标记流已关闭
      streamClosed = true;
      console.log('Client disconnected, cancelling search stream');
    },
  });

  // 返回流式响应
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