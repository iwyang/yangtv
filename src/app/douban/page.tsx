/* eslint-disable no-console, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GetBangumiCalendarData } from '@/lib/bangumi.client';
import {
  getDoubanCategories,
  getDoubanList,
  getDoubanRecommends,
} from '@/lib/douban.client';
import { DoubanItem, DoubanResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanCustomSelector from '@/components/DoubanCustomSelector';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 用于存储最新参数值的 refs（防止竞态条件导致旧数据覆盖新数据）
  const currentParamsRef = useRef({
    type: '',
    primarySelection: '',
    secondarySelection: '',
    multiLevelSelection: {} as Record<string, string>,
    selectedWeekday: '',
    currentPage: 0,
  });

  const type = searchParams.get('type') || 'movie';

  // 自定义分类数据（来自 runtime config）
  const [customCategories, setCustomCategories] = useState<
    Array<{ name: string; type: 'movie' | 'tv'; query: string }>
  >([]);

  // 选择器状态（独立于 URL 参数）
  const [primarySelection, setPrimarySelection] = useState<string>(() => {
    if (type === 'movie' || type === 'tv' || type === 'show') return '全部';
    if (type === 'anime') return '番剧'; // 默认番剧（已移除每日放送）
    return '';
  });

  const [secondarySelection, setSecondarySelection] = useState<string>(() => {
    if (type === 'movie' || type === 'tv' || type === 'show') return '全部';
    return '全部';
  });

  // 多级筛选器状态（默认近期热度 sort: 'U'）
  const [multiLevelValues, setMultiLevelValues] = useState<Record<string, string>>({
    type: 'all',
    region: 'all',
    year: 'all',
    platform: 'all',
    label: 'all',
    sort: 'U', // 近期热度
  });

  // 星期选择器状态（现已无用，但保留以兼容旧代码）
  const [selectedWeekday, setSelectedWeekday] = useState<string>('');

  // 获取自定义分类
  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setCustomCategories(runtimeConfig.CUSTOM_CATEGORIES);
    }
  }, []);

  // 同步最新参数到 ref
  useEffect(() => {
    currentParamsRef.current = {
      type,
      primarySelection,
      secondarySelection,
      multiLevelSelection: multiLevelValues,
      selectedWeekday,
      currentPage,
    };
  }, [type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, currentPage]);

  // 初始化选择器准备标志
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // type 变化 → 重置 loading + 选择器准备状态
  useEffect(() => {
    setSelectorsReady(false);
    setLoading(true);
  }, [type]);

  // type 变化时重置选择器默认值
  useEffect(() => {
    if (type === 'custom' && customCategories.length > 0) {
      const types = Array.from(new Set(customCategories.map(cat => cat.type)));
      if (types.length > 0) {
        let selectedType = types.includes('movie') ? 'movie' : types[0];
        setPrimarySelection(selectedType);

        const firstCat = customCategories.find(cat => cat.type === selectedType);
        if (firstCat) setSecondarySelection(firstCat.query);
      }
    } else {
      if (type === 'movie' || type === 'tv' || type === 'show') {
        setPrimarySelection('全部');
        setSecondarySelection('全部');
      } else if (type === 'anime') {
        setPrimarySelection('番剧');           // 只剩番剧 & 剧场版
        setSecondarySelection('全部');
      } else {
        setPrimarySelection('');
        setSecondarySelection('全部');
      }
    }

    // 重置多级筛选（保持近期热度默认）
    setMultiLevelValues({
      type: 'all',
      region: 'all',
      year: 'all',
      platform: 'all',
      label: 'all',
      sort: 'U',
    });

    const timer = setTimeout(() => setSelectorsReady(true), 50);
    return () => clearTimeout(timer);
  }, [type, customCategories]);

  // 生成骨架屏占位
  const skeletonData = Array.from({ length: 25 }, (_, i) => i);

  // 参数快照比较（避免竞态条件下旧数据覆盖）
  const isSnapshotEqual = useCallback((a: any, b: any) => {
    return (
      a.type === b.type &&
      a.primarySelection === b.primarySelection &&
      a.secondarySelection === b.secondarySelection &&
      a.selectedWeekday === b.selectedWeekday &&
      a.currentPage === b.currentPage &&
      JSON.stringify(a.multiLevelSelection) === JSON.stringify(b.multiLevelSelection)
    );
  }, []);

  // 获取分类接口参数
  const getRequestParams = useCallback((pageStart: number) => {
    if (type === 'tv' || type === 'show') {
      return {
        kind: 'tv' as const,
        category: type,
        type: secondarySelection,
        pageLimit: 25,
        pageStart,
      };
    }
    return {
      kind: type as 'tv' | 'movie',
      category: primarySelection,
      type: secondarySelection,
      pageLimit: 25,
      pageStart,
    };
  }, [type, primarySelection, secondarySelection]);

  // 加载首屏数据
  const loadInitialData = useCallback(async () => {
    const snapshot = {
      type,
      primarySelection,
      secondarySelection,
      multiLevelSelection: multiLevelValues,
      selectedWeekday,
      currentPage: 0,
    };

    try {
      setLoading(true);
      setDoubanData([]);
      setCurrentPage(0);
      setHasMore(true);
      setIsLoadingMore(false);

      let data: DoubanResult;

      if (type === 'custom') {
        const cat = customCategories.find(
          c => c.type === primarySelection && c.query === secondarySelection
        );
        if (!cat) throw new Error('未找到对应分类');
        data = await getDoubanList({
          tag: cat.query,
          type: cat.type,
          pageLimit: 25,
          pageStart: 0,
        });
      } else if (type === 'anime' && primarySelection === '每日放送') {
        // 已移除该分支，但保留空实现避免报错
        data = { code: 200, message: 'success', list: [] };
      } else if (type === 'anime') {
        // 番剧 / 剧场版 使用推荐接口 + 多级筛选
        data = await getDoubanRecommends({
          kind: primarySelection === '番剧' ? 'tv' : 'movie',
          pageLimit: 25,
          pageStart: 0,
          category: '动画',
          format: primarySelection === '番剧' ? '电视剧' : '',
          region: multiLevelValues.region || '',
          year: multiLevelValues.year || '',
          platform: multiLevelValues.platform || '',
          sort: multiLevelValues.sort || '',
          label: multiLevelValues.label || '',
        });
      } else if (primarySelection === '全部') {
        // 全部 → 使用推荐接口
        data = await getDoubanRecommends({
          kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'),
          pageLimit: 25,
          pageStart: 0,
          category: multiLevelValues.type || '',
          format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '',
          region: multiLevelValues.region || '',
          year: multiLevelValues.year || '',
          platform: multiLevelValues.platform || '',
          sort: multiLevelValues.sort || '',
          label: multiLevelValues.label || '',
        });
      } else {
        // 其他分类使用原 categories 接口
        data = await getDoubanCategories(getRequestParams(0));
      }

      if (data.code === 200) {
        if (isSnapshotEqual(snapshot, currentParamsRef.current)) {
          setDoubanData(data.list);
          setHasMore(data.list.length === 25); // 假设每页25条，有25条可能还有更多
        }
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error('加载初始数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [
    type,
    primarySelection,
    secondarySelection,
    multiLevelValues,
    selectedWeekday,
    customCategories,
    getRequestParams,
    isSnapshotEqual,
  ]);

  // 选择器准备好 + 参数变化 → 延迟加载首屏
  useEffect(() => {
    if (!selectorsReady) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      loadInitialData();
    }, 120);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [selectorsReady, loadInitialData]);

  // 加载下一页
  useEffect(() => {
    if (currentPage === 0) return;

    const fetchMore = async () => {
      const snapshot = { ...currentParamsRef.current };

      try {
        setIsLoadingMore(true);

        let data: DoubanResult;

        if (type === 'custom') {
          const cat = customCategories.find(
            c => c.type === primarySelection && c.query === secondarySelection
          );
          if (!cat) throw new Error('未找到对应分类');
          data = await getDoubanList({
            tag: cat.query,
            type: cat.type,
            pageLimit: 25,
            pageStart: currentPage * 25,
          });
        } else if (type === 'anime' && primarySelection === '每日放送') {
          data = { code: 200, message: 'success', list: [] };
        } else if (type === 'anime') {
          data = await getDoubanRecommends({
            kind: primarySelection === '番剧' ? 'tv' : 'movie',
            pageLimit: 25,
            pageStart: currentPage * 25,
            category: '动画',
            format: primarySelection === '番剧' ? '电视剧' : '',
            region: multiLevelValues.region || '',
            year: multiLevelValues.year || '',
            platform: multiLevelValues.platform || '',
            sort: multiLevelValues.sort || '',
            label: multiLevelValues.label || '',
          });
        } else if (primarySelection === '全部') {
          data = await getDoubanRecommends({
            kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'),
            pageLimit: 25,
            pageStart: currentPage * 25,
            category: multiLevelValues.type || '',
            format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '',
            region: multiLevelValues.region || '',
            year: multiLevelValues.year || '',
            platform: multiLevelValues.platform || '',
            sort: multiLevelValues.sort || '',
            label: multiLevelValues.label || '',
          });
        } else {
          data = await getDoubanCategories(getRequestParams(currentPage * 25));
        }

        if (data.code === 200) {
          if (isSnapshotEqual(snapshot, currentParamsRef.current)) {
            setDoubanData(prev => [...prev, ...data.list]);
            setHasMore(data.list.length === 25);
          }
        }
      } catch (err) {
        console.error('加载更多失败:', err);
      } finally {
        setIsLoadingMore(false);
      }
    };

    fetchMore();
  }, [currentPage, type, primarySelection, secondarySelection, multiLevelValues, customCategories, getRequestParams, isSnapshotEqual]);

  // 无限滚动观察器
  useEffect(() => {
    if (!hasMore || isLoadingMore || loading || !loadingRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loading]);

  // 选择器回调
  const handlePrimaryChange = useCallback((value: string) => {
    if (value === primarySelection) return;
    setLoading(true);
    setCurrentPage(0);
    setDoubanData([]);
    setHasMore(true);
    setIsLoadingMore(false);

    setMultiLevelValues(prev => ({ ...prev, sort: 'U' }));

    if (type === 'custom' && customCategories.length > 0) {
      const first = customCategories.find(c => c.type === value);
      setPrimarySelection(value);
      if (first) setSecondarySelection(first.query);
    } else {
      setPrimarySelection(value);
      if ((type === 'tv' || type === 'show') && value === '最近热门') {
        setSecondarySelection(type === 'tv' ? 'tv' : 'show');
      }
    }
  }, [primarySelection, type, customCategories]);

  const handleSecondaryChange = useCallback((value: string) => {
    if (value === secondarySelection) return;
    setLoading(true);
    setCurrentPage(0);
    setDoubanData([]);
    setHasMore(true);
    setIsLoadingMore(false);
    setSecondarySelection(value);
  }, [secondarySelection]);

  const handleMultiLevelChange = useCallback((values: Record<string, string>) => {
    const isEqual = JSON.stringify(values) === JSON.stringify(multiLevelValues);
    if (isEqual) return;

    setLoading(true);
    setCurrentPage(0);
    setDoubanData([]);
    setHasMore(true);
    setIsLoadingMore(false);
    setMultiLevelValues(values);
  }, [multiLevelValues]);

  const handleWeekdayChange = useCallback((weekday: string) => {
    setSelectedWeekday(weekday);
  }, []);

  const getPageTitle = () => {
    switch (type) {
      case 'movie': return '电影';
      case 'tv': return '电视剧';
      case 'anime': return '动漫';
      case 'show': return '综艺';
      default: return '自定义';
    }
  };

  const getPageDescription = () => {
    if (type === 'anime') {
      return '来自豆瓣的动画精选内容';
    }
    return '来自豆瓣的精选内容';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    return `/douban${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className="px-4 sm:px-10 py-4 sm:py-8 overflow-visible">
        {/* 标题 + 选择器 */}
        <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200">
              {getPageTitle()}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {getPageDescription()}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm">
            {type !== 'custom' ? (
              <DoubanSelector
                type={type as 'movie' | 'tv' | 'show' | 'anime'}
                primarySelection={primarySelection}
                secondarySelection={secondarySelection}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
                onMultiLevelChange={handleMultiLevelChange}
                onWeekdayChange={handleWeekdayChange}
              />
            ) : (
              <DoubanCustomSelector
                customCategories={customCategories}
                primarySelection={primarySelection}
                secondarySelection={secondarySelection}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
              />
            )}
          </div>
        </div>

        {/* 内容网格 */}
        <div className="max-w-[95%] mx-auto mt-8 overflow-visible">
          <div className="justify-start grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20">
            {loading || !selectorsReady
              ? skeletonData.map(i => <DoubanCardSkeleton key={i} />)
              : doubanData.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="w-full">
                    <VideoCard
                      from="douban"
                      title={item.title}
                      poster={item.poster}
                      douban_id={Number(item.id)}
                      rate={item.rate}
                      year={item.year}
                      type={type === 'movie' ? 'movie' : undefined}
                      isBangumi={false}
                    />
                  </div>
                ))}
          </div>

          {/* 加载更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={loadingRef}
              className="flex justify-center mt-12 py-8"
            >
              {isLoadingMore && (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">加载中...</span>
                </div>
              )}
            </div>
          )}

          {!hasMore && doubanData.length > 0 && (
            <div className="text-center text-gray-500 py-10">
              已加载全部内容
            </div>
          )}

          {!loading && doubanData.length === 0 && selectorsReady && (
            <div className="text-center text-gray-500 py-10">
              暂无相关内容
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <DoubanPageClient />
    </Suspense>
  );
}