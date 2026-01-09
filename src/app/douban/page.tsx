/* eslint-disable no-console,react-hooks/exhaustive-deps,@typescript-eslint/no-explicit-any */

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

  // 用于存储最新参数值的 refs
  const currentParamsRef = useRef({
    type: '',
    primarySelection: '',
    secondarySelection: '',
    multiLevelSelection: {} as Record<string, string>,
    selectedWeekday: '',
    currentPage: 0,
  });

  const type = searchParams.get('type') || 'movie';

  // 获取 runtimeConfig 中的自定义分类数据
  const [customCategories, setCustomCategories] = useState<
    Array<{ name: string; type: 'movie' | 'tv'; query: string }>
  >([]);

  // 选择器状态 - 完全独立，不依赖URL参数
  const [primarySelection, setPrimarySelection] = useState<string>(() => {
    if (type === 'movie' || type === 'tv' || type === 'show') return '全部';
    if (type === 'anime') return '番剧';
    return '';
  });
  const [secondarySelection, setSecondarySelection] = useState<string>(() => {
    if (type === 'movie' || type === 'tv' || type === 'show') return '全部';
    return '全部';
  });

  // MultiLevelSelector 状态
  const [multiLevelValues, setMultiLevelValues] = useState<
    Record<string, string>
  >({
    type: 'all',
    region: 'all',
    year: 'all',
    platform: 'all',
    label: 'all',
    sort: 'U',
  });

  // 星期选择器状态
  const [selectedWeekday, setSelectedWeekday] = useState<string>('');

  // 获取自定义分类数据
  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setCustomCategories(runtimeConfig.CUSTOM_CATEGORIES);
    }
  }, []);

  // 同步最新参数值到 ref
  useEffect(() => {
    currentParamsRef.current = {
      type,
      primarySelection,
      secondarySelection,
      multiLevelSelection: multiLevelValues,
      selectedWeekday,
      currentPage,
    };
  }, [
    type,
    primarySelection,
    secondarySelection,
    multiLevelValues,
    selectedWeekday,
    currentPage,
  ]);

  // 初始化时标记选择器为准备好状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  // type变化时立即重置selectorsReady（最高优先级）
  useEffect(() => {
    setSelectorsReady(false);
    setLoading(true); // 立即显示loading状态
  }, [type]);

  // 当type变化时重置选择器状态
  useEffect(() => {
    if (type === 'custom' && customCategories.length > 0) {
      const types = Array.from(
        new Set(customCategories.map((cat) => cat.type))
      );
      if (types.length > 0) {
        let selectedType = types[0]; // 默认选择第一个
        if (types.includes('movie')) {
          selectedType = 'movie';
        } else {
          selectedType = 'tv';
        }
        setPrimarySelection(selectedType);

        const firstCategory = customCategories.find(
          (cat) => cat.type === selectedType
        );
        if (firstCategory) {
          setSecondarySelection(firstCategory.query);
        }
      }
    } else {
      if (type === 'movie' || type === 'tv' || type === 'show') {
        setPrimarySelection('全部');
        setSecondarySelection('全部');
      } else if (type === 'anime') {
        setPrimarySelection('番剧');
        setSecondarySelection('全部');
      } else {
        setPrimarySelection('');
        setSecondarySelection('全部');
      }
    }

    // 清空 MultiLevelSelector 状态
    setMultiLevelValues({
      type: 'all',
      region: 'all',
      year: 'all',
      platform: 'all',
      label: 'all',
      sort: 'U', // 默认近期热度
    });

    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [type, customCategories]);

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 参数快照比较函数
  const isSnapshotEqual = useCallback(
    (
      snapshot1: {
        type: string;
        primarySelection: string;
        secondarySelection: string;
        multiLevelSelection: Record<string, string>;
        selectedWeekday: string;
        currentPage: number;
      },
      snapshot2: {
        type: string;
        primarySelection: string;
        secondarySelection: string;
        multiLevelSelection: Record<string, string>;
        selectedWeekday: string;
        currentPage: number;
      }
    ) => {
      return (
        snapshot1.type === snapshot2.type &&
        snapshot1.primarySelection === snapshot2.primarySelection &&
        snapshot1.secondarySelection === snapshot2.secondarySelection &&
        snapshot1.selectedWeekday === snapshot2.selectedWeekday &&
        snapshot1.currentPage === snapshot2.currentPage &&
        JSON.stringify(snapshot1.multiLevelSelection) ===
          JSON.stringify(snapshot2.multiLevelSelection)
      );
    },
    []
  );

  // 生成API请求参数的辅助函数
  const getRequestParams = useCallback(
    (pageStart: number) => {
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
    },
    [type, primarySelection, secondarySelection]
  );

  // 加载初始数据函数
  const loadInitialData = useCallback(async () => {
    const requestSnapshot = {
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
        const selectedCategory = customCategories.find(
          (cat) =>
            cat.type === primarySelection && cat.query === secondarySelection
        );

        if (selectedCategory) {
          data = await getDoubanList({
            tag: selectedCategory.query,
            type: selectedCategory.type,
            pageLimit: 25,
            pageStart: 0,
          });
        } else {
          throw new Error('没有找到对应的分类');
        }
      } else if (type === 'anime' && primarySelection === '每日放送') {
        const calendarData = await GetBangumiCalendarData();
        const weekdayData = calendarData.find(
          (item) => item.weekday.en === selectedWeekday
        );
        if (weekdayData) {
          data = {
            code: 200,
            message: 'success',
            list: weekdayData.items
              .filter((item) => item && item.id)
              .map((item) => ({
                id: item.id?.toString() || '',
                title: item.name_cn || item.name,
                poster:
                  item.images?.large ||
                  item.images?.common ||
                  item.images?.medium ||
                  item.images?.small ||
                  item.images?.grid ||
                  '/logo.png',
                rate: item.rating?.score?.toFixed(1) || '',
                year: item.air_date?.split('-')?.[0] || '',
              })),
          };
        } else {
          throw new Error('没有找到对应的日期');
        }
      } else if (type === 'anime') {
        data = await getDoubanRecommends({
          kind: primarySelection === '番剧' ? 'tv' : 'movie',
          pageLimit: 25,
          pageStart: 0,
          category: '动画',
          format: primarySelection === '番剧' ? '电视剧' : '',
          region: multiLevelValues.region
            ? (multiLevelValues.region as string)
            : '',
          year: multiLevelValues.year ? (multiLevelValues.year as string) : '',
          platform: multiLevelValues.platform
            ? (multiLevelValues.platform as string)
            : '',
          sort: multiLevelValues.sort ? (multiLevelValues.sort as string) : '',
          label: multiLevelValues.label
            ? (multiLevelValues.label as string)
            : '',
        });
      } else if (primarySelection === '全部') {
        data = await getDoubanRecommends({
          kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'),
          pageLimit: 25,
          pageStart: 0,
          category: multiLevelValues.type
            ? (multiLevelValues.type as string)
            : '',
          format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '',
          region: multiLevelValues.region
            ? (multiLevelValues.region as string)
            : '',
          year: multiLevelValues.year ? (multiLevelValues.year as string) : '',
          platform: multiLevelValues.platform
            ? (multiLevelValues.platform as string)
            : '',
          sort: multiLevelValues.sort ? (multiLevelValues.sort as string) : '',
          label: multiLevelValues.label
            ? (multiLevelValues.label as string)
            : '',
        });
      } else {
        data = await getDoubanCategories(getRequestParams(0));
      }

      if (data.code === 200) {
        const currentSnapshot = { ...currentParamsRef.current };

        if (isSnapshotEqual(requestSnapshot, currentSnapshot)) {
          setDoubanData(data.list);
          setHasMore(data.list.length !== 0);
          setLoading(false);
        } else {
          console.log('参数不一致，不执行任何操作，避免设置过期数据');
        }
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [
    type,
    primarySelection,
    secondarySelection,
    multiLevelValues,
    selectedWeekday,
    getRequestParams,
    customCategories,
  ]);

  // 只在选择器准备好后才加载数据
  useEffect(() => {
    if (!selectorsReady) {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      loadInitialData();
    }, 100);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    selectorsReady,
    type,
    primarySelection,
    secondarySelection,
    multiLevelValues,
    selectedWeekday,
    loadInitialData,
  ]);

  // 加载更多
  useEffect(() => {
    if (currentPage > 0) {
      const fetchMoreData = async () => {
        const requestSnapshot = {
          type,
          primarySelection,
          secondarySelection,
          multiLevelSelection: multiLevelValues,
          selectedWeekday,
          currentPage,
        };

        try {
          setIsLoadingMore(true);

          let data: DoubanResult;
          if (type === 'custom') {
            const selectedCategory = customCategories.find(
              (cat) =>
                cat.type === primarySelection &&
                cat.query === secondarySelection
            );

            if (selectedCategory) {
              data = await getDoubanList({
                tag: selectedCategory.query,
                type: selectedCategory.type,
                pageLimit: 25,
                pageStart: currentPage * 25,
              });
            } else {
              throw new Error('没有找到对应的分类');
            }
          } else if (type === 'anime' && primarySelection === '每日放送') {
            data = {
              code: 200,
              message: 'success',
              list: [],
            };
          } else if (type === 'anime') {
            data = await getDoubanRecommends({
              kind: primarySelection === '番剧' ? 'tv' : 'movie',
              pageLimit: 25,
              pageStart: currentPage * 25,
              category: '动画',
              format: primarySelection === '番剧' ? '电视剧' : '',
              region: multiLevelValues.region
                ? (multiLevelValues.region as string)
                : '',
              year: multiLevelValues.year
                ? (multiLevelValues.year as string)
                : '',
              platform: multiLevelValues.platform
                ? (multiLevelValues.platform as string)
                : '',
              sort: multiLevelValues.sort
                ? (multiLevelValues.sort as string)
                : '',
              label: multiLevelValues.label
                ? (multiLevelValues.label as string)
                : '',
            });
          } else if (primarySelection === '全部') {
            data = await getDoubanRecommends({
              kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'),
              pageLimit: 25,
              pageStart: currentPage * 25,
              category: multiLevelValues.type
                ? (multiLevelValues.type as string)
                : '',
              format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '',
              region: multiLevelValues.region
                ? (multiLevelValues.region as string)
                : '',
              year: multiLevelValues.year
                ? (multiLevelValues.year as string)
                : '',
              platform: multiLevelValues.platform
                ? (multiLevelValues.platform as string)
                : '',
              sort: multiLevelValues.sort
                ? (multiLevelValues.sort as string)
                : '',
              label: multiLevelValues.label
                ? (multiLevelValues.label as string)
                : '',
            });
          } else {
            data = await getDoubanCategories(
              getRequestParams(currentPage * 25)
            );
          }

          if (data.code === 200) {
            const currentSnapshot = { ...currentParamsRef.current };

            if (isSnapshotEqual(requestSnapshot, currentSnapshot)) {
              setDoubanData((prev) => [...prev, ...data.list]);
              setHasMore(data.list.length !== 0);
            } else {
              console.log('参数不一致，不执行任何操作，避免设置过期数据');
            }
          } else {
            throw new Error(data.message || '获取数据失败');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreData();
    }
  }, [
    currentPage,
    type,
    primarySelection,
    secondarySelection,
    customCategories,
    multiLevelValues,
    selectedWeekday,
  ]);

  // 设置滚动监听
  useEffect(() => {
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    if (!loadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  // 处理选择器变化
  const handlePrimaryChange = useCallback(
    (value: string) => {
      if (value !== primarySelection) {
        setLoading(true);
        setCurrentPage(0);
        setDoubanData([]);
        setHasMore(true);
        setIsLoadingMore(false);

        setMultiLevelValues({
          type: 'all',
          region: 'all',
          year: 'all',
          platform: 'all',
          label: 'all',
          sort: 'U', // 默认近期热度
        });

        if (type === 'custom' && customCategories.length > 0) {
          const firstCategory = customCategories.find(
            (cat) => cat.type === value
          );
          if (firstCategory) {
            setPrimarySelection(value);
            setSecondarySelection(firstCategory.query);
          } else {
            setPrimarySelection(value);
          }
        } else {
          if ((type === 'tv' || type === 'show') && value === '最近热门') {
            setPrimarySelection(value);
            if (type === 'tv') {
              setSecondarySelection('tv');
            } else if (type === 'show') {
              setSecondarySelection('show');
            }
          } else {
            setPrimarySelection(value);
          }
        }
      }
    },
    [primarySelection, type, customCategories]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value !== secondarySelection) {
        setLoading(true);
        setCurrentPage(0);
        setDoubanData([]);
        setHasMore(true);
        setIsLoadingMore(false);
        setSecondarySelection(value);
      }
    },
    [secondarySelection]
  );

  const handleMultiLevelChange = useCallback(
    (values: Record<string, string>) => {
      const isEqual = (
        obj1: Record<string, string>,
        obj2: Record<string, string>
      ) => {
        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();

        if (keys1.length !== keys2.length) return false;

        return keys1.every((key) => obj1[key] === obj2[key]);
      };

      if (isEqual(values, multiLevelValues)) {
        return;
      }

      setLoading(true);
      setCurrentPage(0);
      setDoubanData([]);
      setHasMore(true);
      setIsLoadingMore(false);
      setMultiLevelValues(values);
    },
    [multiLevelValues]
  );

  const handleWeekdayChange = useCallback((weekday: string) => {
    setSelectedWeekday(weekday);
  }, []);

  const getPageTitle = () => {
    return type === 'movie'
      ? '电影'
      : type === 'tv'
      ? '电视剧'
      : type === 'anime'
      ? '动漫'
      : type === 'show'
      ? '综艺'
      : '自定义';
  };

  const getPageDescription = () => {
    if (type === 'anime' && primarySelection === '每日放送') {
      return '来自 Bangumi 番组计划的精选内容';
    }
    return '来自豆瓣的精选内容';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 页面标题和选择器 */}
        <div className='mb-6 sm:mb-8 space-y-4 sm:space-y-6'>
          {/* 页面标题 */}
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
              {getPageTitle()}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
              {getPageDescription()}
            </p>
          </div>

          {/* 选择器组件 */}
          {type !== 'custom' ? (
            <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
              <DoubanSelector
                type={type as 'movie' | 'tv' | 'show' | 'anime'}
                primarySelection={primarySelection}
                secondarySelection={secondarySelection}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
                onMultiLevelChange={handleMultiLevelChange}
                onWeekdayChange={handleWeekdayChange}
              />
            </div>
          ) : (
            <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
              <DoubanCustomSelector
                customCategories={customCategories}
                primarySelection={primarySelection}
                secondarySelection={secondarySelection}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
              />
            </div>
          )}
        </div>

        {/* 内容展示区域 */}
        <div className='max-w-[95%] mx-auto mt-8 overflow-visible'>
          {/* 内容网格 */}
          <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
            {loading || !selectorsReady
              ? // 显示骨架屏
                skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : // 显示实际数据
                doubanData.map((item, index) => (
                  <div key={`${item.title}-${index}`} className='w-full'>
                    <VideoCard
                      from='douban'
                      title={item.title}
                      poster={item.poster}
                      douban_id={Number(item.id)}
                      rate={item.rate}
                      year={item.year}
                      type={type === 'movie' ? 'movie' : ''} // 电影类型严格控制，tv 不控
                      isBangumi={
                        type === 'anime' && primarySelection === '每日放送'
                      }
                    />
                  </div>
                ))}
          </div>

          {/* 加载更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={(el) => {
                if (el && el.offsetParent !== null) {
                  (
                    loadingRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = el;
                }
              }}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                  <span className='text-gray-600'>加载中...</span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && doubanData.length > 0 && (
            <div className='text-center text-gray-500 py-8'>已加载全部内容</div>
          )}

          {/* 空状态 */}
          {!loading && doubanData.length === 0 && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}