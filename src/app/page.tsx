/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

// --- API Imports ---
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanRecommends } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

// --- Component Imports ---
import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import DecoTVFooterCard from '@/components/DecoTVFooterCard';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

// --- Interfaces ---
interface FavoriteItem {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
  origin?: 'vod' | 'live';
  year?: string;
}

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [hotAnimes, setHotAnimes] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { siteName, announcement } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // Announcement logic
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeen = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeen !== announcement) {
        setShowAnnouncement(true);
      }
    }
  }, [announcement]);

  // Data fetching logic
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [moviesRes, tvRes, varietyRes, animeRes] = await Promise.all([
          getDoubanRecommends({ kind: 'movie', pageLimit: 20, sort: 'U' }),
          getDoubanRecommends({ kind: 'tv', pageLimit: 20, format: '电视剧', sort: 'U' }),
          getDoubanRecommends({ kind: 'tv', pageLimit: 20, format: '综艺', sort: 'U' }),
          getDoubanRecommends({ kind: 'tv', pageLimit: 20, category: '动画', format: '电视剧', sort: 'U' }),
        ]);

        if (moviesRes.code === 200) setHotMovies(moviesRes.list);
        if (tvRes.code === 200) setHotTvShows(tvRes.list);
        if (varietyRes.code === 200) setHotVarietyShows(varietyRes.list);
        if (animeRes.code === 200) setHotAnimes(animeRes.list);
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Sync favorites and play records
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);
        const playRecord = allPlayRecords[key];
        
        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode: playRecord?.index,
          search_title: fav?.search_title,
          origin: fav?.origin,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };
    loadFavorites();
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', (newFavs: any) => {
      updateFavoriteItems(newFavs);
    });
    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (msg: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', msg);
  };

  return (
    <PageLayout>
      {/* Visual Header Section */}
      <div className="relative pt-20 pb-10 sm:pt-32 sm:pb-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 sm:w-150 sm:h-150 bg-purple-500/20 rounded-full blur-[80px] sm:blur-[120px] -z-10 pointer-events-none animate-pulse" />
        <div className="flex flex-col items-center justify-center text-center px-4">
          <div className="relative group">
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter deco-brand drop-shadow-2xl select-none transition-transform duration-500 group-hover:scale-105">
              {siteName || 'DecoTV'}
            </h1>
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div className="mt-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg">
              <span className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100">发现</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100">收藏</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100">继续观看</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-10 py-4 sm:py-8">
        {/* Tab Switcher */}
        <div className="mb-8 flex justify-center">
          <CapsuleSwitch
            options={[{ label: '首页', value: 'home' }, { label: '收藏夹', value: 'favorites' }]}
            active={activeTab}
            onChange={(v) => setActiveTab(v as any)}
          />
        </div>

        <div className="max-w-[95%] mx-auto">
          {activeTab === 'favorites' ? (
            /* --- Favorites View --- */
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">我的收藏夹</h2>
                {favoriteItems.length > 0 && (
                  <button 
                    className="text-sm font-medium text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                    onClick={async () => { 
                      if(confirm('确定清空所有收藏记录吗？')) { 
                        await clearAllFavorites(); 
                        setFavoriteItems([]); 
                      } 
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-14 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-8 sm:gap-y-20">
                {favoriteItems.map((item) => (
                  <VideoCard key={item.id + item.source} query={item.search_title} {...item} from="favorite" type={item.episodes > 1 ? 'tv' : ''} />
                ))}
                {favoriteItems.length === 0 && (
                  <div className="col-span-full text-center py-20 text-gray-400">暂无收藏内容</div>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* --- Home Sections --- */}
              <ContinueWatching />

              {/* 1. Movies */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">热门电影</h2>
                  <Link href="/douban?type=movie" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    查看更多 <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44 h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )) : hotMovies.slice(0, 18).map((item, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                      <VideoCard from="douban" title={item.title} poster={item.poster} douban_id={Number(item.id)} rate={item.rate} year={item.year} type="movie" />
                    </div>
                  ))}
                </ScrollableRow>
              </section>

              {/* 2. TV Shows */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">热门剧集</h2>
                  <Link href="/douban?type=tv" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    查看更多 <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44 h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )) : hotTvShows.slice(0, 18).map((item, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                      <VideoCard from="douban" title={item.title} poster={item.poster} douban_id={Number(item.id)} rate={item.rate} year={item.year} />
                    </div>
                  ))}
                </ScrollableRow>
              </section>

              {/* 3. Anime */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">热门番剧</h2>
                  <Link href="/douban?type=anime" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    查看更多 <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44 h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )) : hotAnimes.slice(0, 18).map((item, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                      <VideoCard from="douban" title={item.title} poster={item.poster} douban_id={Number(item.id)} rate={item.rate} year={item.year} />
                    </div>
                  ))}
                </ScrollableRow>
              </section>

              {/* 4. Variety Shows */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">热门综艺</h2>
                  <Link href="/douban?type=show" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    查看更多 <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44 h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )) : hotVarietyShows.slice(0, 18).map((item, i) => (
                    <div key={i} className="min-w-24 w-24 sm:min-w-45 sm:w-44">
                      <VideoCard from="douban" title={item.title} poster={item.poster} douban_id={Number(item.id)} rate={item.rate} year={item.year} />
                    </div>
                  ))}
                </ScrollableRow>
              </section>

              <DecoTVFooterCard />
            </>
          )}
        </div>
      </div>

      {/* --- Announcement Modal --- */}
      {announcement && showAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-500 border-b-2 border-purple-400 pb-1">
                系统公告
              </h3>
              <button 
                onClick={() => handleCloseAnnouncement(announcement)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <div className="relative overflow-hidden rounded-lg p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 shadow-inner">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-500" />
                <p className="ml-2 text-gray-700 dark:text-gray-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-white font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all"
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeClient />
    </Suspense>
  );
}