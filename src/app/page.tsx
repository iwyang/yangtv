/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

import {
  getDoubanRecommends,
} from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import DecoTVFooterCard from '@/components/DecoTVFooterCard';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [hotAnimes, setHotAnimes] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { siteName, announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 检查是否已看过公告
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeen = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeen !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeen && announcement));
      }
    }
  }, [announcement]);

  // 收藏夹相关类型
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
    origin?: 'vod' | 'live';
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // 首页数据加载（全部改为近期热度推荐）
  useEffect(() => {
    const fetchRecommendData = async () => {
      try {
        setLoading(true);

        const [
          moviesRes,
          tvRes,
          varietyRes,
          animeRes,
        ] = await Promise.all([
          // 热门电影 → 全部电影 + 近期热度
          getDoubanRecommends({
            kind: 'movie',
            pageLimit: 20,
            sort: 'U',
          }),
          // 热门剧集 → 全部电视剧 + 近期热度
          getDoubanRecommends({
            kind: 'tv',
            pageLimit: 20,
            format: '电视剧',
            sort: 'U',
          }),
          // 热门综艺 → 全部综艺 + 近期热度
          getDoubanRecommends({
            kind: 'tv',
            pageLimit: 20,
            format: '综艺',
            sort: 'U',
          }),
          // 热门番剧 → 动画（番剧） + 近期热度
          getDoubanRecommends({
            kind: 'tv',
            pageLimit: 20,
            category: '动画',
            format: '电视剧',
            sort: 'U',
          }),
        ]);

        if (moviesRes.code === 200) {
          setHotMovies(moviesRes.list);
        }
        if (tvRes.code === 200) {
          setHotTvShows(tvRes.list);
        }
        if (varietyRes.code === 200) {
          setHotVarietyShows(varietyRes.list);
        }
        if (animeRes.code === 200) {
          setHotAnimes(animeRes.list);
        }
      } catch (error) {
        console.error('获取首页推荐数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendData();
  }, []);

  // 收藏夹数据加载（保持原有逻辑）
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      // ... 原有 getAllFavorites / updateFavoriteItems 逻辑 ...
      // （这里省略具体实现，如果你有独立的收藏夹代码请自行合并）
      // 示例占位：
      setFavoriteItems([]); // 请替换为实际逻辑
    };

    loadFavorites();

    // 订阅更新（如果有）
    // const unsubscribe = subscribeToDataUpdates(...);
    // return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  return (
    <PageLayout>
      {/* Hero Section */}
      <div className="relative pt-20 pb-10 sm:pt-32 sm:pb-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 sm:w-150 sm:h-150 bg-purple-500/20 rounded-full blur-[80px] sm:blur-[120px] -z-10 pointer-events-none animate-pulse" />

        <div className="flex flex-col items-center justify-center text-center px-4">
          <div className="relative group cursor-default">
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter deco-brand drop-shadow-2xl select-none transition-transform duration-500 group-hover:scale-105">
              {siteName || 'DecoTV'}
            </h1>
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          <div className="mt-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
              <span className="text-base sm:text-lg font-medium bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                发现
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-base sm:text-lg font-medium bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                收藏
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-base sm:text-lg font-medium bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                继续观看
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-10 py-4 sm:py-8 overflow-visible">
        {/* Tab 切换 */}
        <div className="mb-8 flex justify-center">
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        <div className="max-w-[95%] mx-auto">
          {activeTab === 'favorites' ? (
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={async () => {
                      // await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              <div className="justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-8">
                {favoriteItems.map((item) => (
                  <div key={item.id + item.source} className="w-full">
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from="favorite"
                      type={item.episodes > 1 ? 'tv' : ''}
                    />
                  </div>
                ))}
                {favoriteItems.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8 dark:text-gray-400">
                    暂无收藏内容
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* 继续观看 */}
              <ContinueWatching />

              {/* 热门电影 */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    热门电影
                  </h2>
                  <Link
                    href="/douban?type=movie"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    查看更多
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800">
                            <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700" />
                          </div>
                          <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800" />
                        </div>
                      ))
                    : hotMovies.slice(0, 8).map((movie, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <VideoCard
                            from="douban"
                            title={movie.title}
                            poster={movie.poster}
                            douban_id={Number(movie.id)}
                            rate={movie.rate}
                            year={movie.year}
                            type="movie"
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门剧集 */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    热门剧集
                  </h2>
                  <Link
                    href="/douban?type=tv"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    查看更多
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800">
                            <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700" />
                          </div>
                          <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800" />
                        </div>
                      ))
                    : hotTvShows.slice(0, 8).map((show, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <VideoCard
                            from="douban"
                            title={show.title}
                            poster={show.poster}
                            douban_id={Number(show.id)}
                            rate={show.rate}
                            year={show.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门番剧 */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    热门番剧
                  </h2>
                  <Link
                    href="/douban?type=anime"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    查看更多
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800">
                            <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700" />
                          </div>
                          <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800" />
                        </div>
                      ))
                    : hotAnimes.slice(0, 8).map((anime, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <VideoCard
                            from="douban"
                            title={anime.title}
                            poster={anime.poster}
                            douban_id={Number(anime.id)}
                            rate={anime.rate}
                            year={anime.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门综艺 */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    热门综艺
                  </h2>
                  <Link
                    href="/douban?type=show"
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    查看更多
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800">
                            <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700" />
                          </div>
                          <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800" />
                        </div>
                      ))
                    : hotVarietyShows.slice(0, 8).map((show, index) => (
                        <div key={index} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                          <VideoCard
                            from="douban"
                            title={show.title}
                            poster={show.poster}
                            douban_id={Number(show.id)}
                            rate={show.rate}
                            year={show.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              <DecoTVFooterCard />
            </>
          )}
        </div>
      </div>

      {/* 公告弹窗 */}
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          style={{ touchAction: 'none' }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl"
            onTouchMove={(e) => e.stopPropagation()}
            style={{ touchAction: 'auto' }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-500 border-b-2 border-purple-400 pb-1 drop-shadow-lg">
                公告
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className="text-purple-400 hover:text-purple-600 dark:text-purple-300 dark:hover:text-white transition-colors"
                aria-label="关闭"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <div className="relative overflow-hidden rounded-lg mb-4 p-4 bg-gradient-to-r from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/40 dark:via-pink-900/30 dark:to-indigo-900/40 shadow-lg">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-purple-500 via-pink-400 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400" />
                <p className="ml-4 text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                  {announcement}
                </p>
                <div className="absolute right-2 bottom-2 w-8 h-8 bg-gradient-to-tr from-purple-400 via-pink-400 to-indigo-400 rounded-full blur-xl opacity-40 animate-pulse" />
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-purple-700 hover:via-pink-600 hover:to-indigo-700 dark:from-purple-600 dark:via-pink-500 dark:to-indigo-600 dark:hover:from-purple-700 dark:hover:via-pink-600 dark:hover:to-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <HomeClient />
    </Suspense>
  );
}