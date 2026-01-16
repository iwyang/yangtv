/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

import MultiLevelSelector from './MultiLevelSelector';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show' | 'anime';
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onMultiLevelChange?: (values: Record<string, string>) => void;
  onWeekdayChange: (weekday: string) => void;
}

const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
  onMultiLevelChange,
  onWeekdayChange,
}) => {
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 电影一级选项
  const moviePrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '热门电影', value: '热门' },
    { label: '最新电影', value: '最新' },
    { label: '豆瓣高分', value: '豆瓣高分' },
    { label: '冷门佳片', value: '冷门佳片' },
  ];

  const movieSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '华语', value: '华语' },
    { label: '欧美', value: '欧美' },
    { label: '韩国', value: '韩国' },
    { label: '日本', value: '日本' },
  ];

  // 电视剧一级选项
  const tvPrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];

  const tvSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: 'tv' },
    { label: '国产', value: 'tv_domestic' },
    { label: '欧美', value: 'tv_american' },
    { label: '日本', value: 'tv_japanese' },
    { label: '韩国', value: 'tv_korean' },
    { label: '动漫', value: 'tv_animation' },
    { label: '纪录片', value: 'tv_documentary' },
  ];

  // 综艺一级选项
  const showPrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];

  const showSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: 'show' },
    { label: '国内', value: 'show_domestic' },
    { label: '国外', value: 'show_foreign' },
  ];

  // 动漫一级选项（已移除“每日放送”）
  const animePrimaryOptions: SelectorOption[] = [
    { label: '番剧', value: '番剧' },
    { label: '剧场版', value: '剧场版' },
  ];

  const handleMultiLevelChange = (values: Record<string, string>) => {
    onMultiLevelChange?.(values);
  };

  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement | null>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const button = buttonRefs.current[activeIndex];
        const container = containerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (buttonRect.width > 0) {
            setIndicatorStyle({
              left: buttonRect.left - containerRect.left,
              width: buttonRect.width,
            });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  // 组件挂载 + type 变化时初始化指示器
  useEffect(() => {
    let activeIndex = -1;

    if (type === 'movie') {
      activeIndex = moviePrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || '全部')
      );
    } else if (type === 'tv') {
      activeIndex = tvPrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || '最近热门')
      );
    } else if (type === 'show') {
      activeIndex = showPrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || '最近热门')
      );
    } else if (type === 'anime') {
      activeIndex = animePrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || '番剧')
      );
    }

    if (activeIndex >= 0) {
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    }

    // 副选择器初始化
    let secIndex = -1;
    if (type === 'movie') {
      secIndex = movieSecondaryOptions.findIndex(
        (opt) => opt.value === (secondarySelection || '全部')
      );
    } else if (type === 'tv') {
      secIndex = tvSecondaryOptions.findIndex(
        (opt) => opt.value === (secondarySelection || 'tv')
      );
    } else if (type === 'show') {
      secIndex = showSecondaryOptions.findIndex(
        (opt) => opt.value === (secondarySelection || 'show')
      );
    }

    if (secIndex >= 0) {
      updateIndicatorPosition(
        secIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
    }
  }, [type]);

  // 主选择器变化时更新指示器
  useEffect(() => {
    let activeIndex = -1;
    if (type === 'movie') {
      activeIndex = moviePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
    } else if (type === 'tv') {
      activeIndex = tvPrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
    } else if (type === 'show') {
      activeIndex = showPrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
    } else if (type === 'anime') {
      activeIndex = animePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
    }

    if (activeIndex >= 0) {
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    }
  }, [primarySelection]);

  // 副选择器变化时更新指示器
  useEffect(() => {
    let activeIndex = -1;
    if (type === 'movie') {
      activeIndex = movieSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
    } else if (type === 'tv') {
      activeIndex = tvSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
    } else if (type === 'show') {
      activeIndex = showSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
    }

    if (activeIndex >= 0) {
      updateIndicatorPosition(
        activeIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
    }
  }, [secondarySelection]);

  const renderCapsuleSelector = (
    options: SelectorOption[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    isPrimary = false
  ) => {
    const containerRef = isPrimary ? primaryContainerRef : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary ? primaryIndicatorStyle : secondaryIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className="relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm"
      >
        {indicatorStyle.width > 0 && (
          <div
            className="absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => (buttonRefs.current[index] = el)}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 电影 */}
      {type === 'movie' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
              分类
            </span>
            <div className="overflow-x-auto">
              {renderCapsuleSelector(
                moviePrimaryOptions,
                primarySelection || '全部',
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {primarySelection !== '全部' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                地区
              </span>
              <div className="overflow-x-auto">
                {renderCapsuleSelector(
                  movieSecondaryOptions,
                  secondarySelection || '全部',
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 电视剧 */}
      {type === 'tv' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
              分类
            </span>
            <div className="overflow-x-auto">
              {renderCapsuleSelector(
                tvPrimaryOptions,
                primarySelection || '最近热门',
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {(primarySelection || '最近热门') === '最近热门' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                类型
              </span>
              <div className="overflow-x-auto">
                {renderCapsuleSelector(
                  tvSecondaryOptions,
                  secondarySelection || 'tv',
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (primarySelection || '最近热门') === '全部' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 动漫（无每日放送） */}
      {type === 'anime' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
              分类
            </span>
            <div className="overflow-x-auto">
              {renderCapsuleSelector(
                animePrimaryOptions,
                primarySelection || '番剧',
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
              筛选
            </span>
            <div className="overflow-x-auto">
              {primarySelection === '番剧' ? (
                <MultiLevelSelector
                  key="anime-tv"
                  onChange={handleMultiLevelChange}
                  contentType="anime-tv"
                />
              ) : (
                <MultiLevelSelector
                  key="anime-movie"
                  onChange={handleMultiLevelChange}
                  contentType="anime-movie"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 综艺 */}
      {type === 'show' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
              分类
            </span>
            <div className="overflow-x-auto">
              {renderCapsuleSelector(
                showPrimaryOptions,
                primarySelection || '最近热门',
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {(primarySelection || '最近热门') === '最近热门' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                类型
              </span>
              <div className="overflow-x-auto">
                {renderCapsuleSelector(
                  showSecondaryOptions,
                  secondarySelection || 'show',
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (primarySelection || '最近热门') === '全部' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DoubanSelector;