/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Cat, Clover, Film, Home, Radio, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export default function TopNavbar() {
  const { siteName } = useSite();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => {
    return pathname === href;
  };

  const isDoubanActive = (type: string) => {
    const currentType = searchParams.get('type');
    return pathname.startsWith('/douban') && currentType === type;
  };

  return (
    <header className='hidden md:block fixed top-0 left-0 right-0 z-900'>
      <div className='mx-auto max-w-7xl px-4'>
        <div className='mt-2 rounded-2xl border border-white/10 bg-white/30 dark:bg-gray-900/40 shadow-[0_0_1px_0_rgba(255,255,255,0.5),0_0_40px_-10px_rgba(99,102,241,0.5)] backdrop-blur-xl'>
          <nav className='flex items-center justify-between h-14 px-3'>
            {/* Left: Logo */}
            <div className='flex items-center gap-2 min-w-0'>
              <Link
                href='/'
                className='shrink-0 select-none hover:opacity-90 transition-opacity'
              >
                <span className='text-xl font-black tracking-tight deco-brand'>
                  {siteName || 'DecoTV'}
                </span>
              </Link>
            </div>

            {/* Center: Controls */}
            <div className='flex items-center justify-center gap-2 flex-wrap'>
              <Link
                href='/'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-home ${
                  isActive('/') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Home className='h-4 w-4' />
                <span>首页</span>
              </Link>
              <Link
                href='/search'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-search ${
                  isActive('/search') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Search className='h-4 w-4' />
                <span>搜索</span>
              </Link>

              {/* Categories */}
              <Link
                href='/douban?type=movie'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-movie ${
                  isDoubanActive('movie') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Film className='h-4 w-4' />
                <span>电影</span>
              </Link>
              <Link
                href='/douban?type=tv'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-tv ${
                  isDoubanActive('tv') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Tv className='h-4 w-4' />
                <span>剧集</span>
              </Link>
              <Link
                href='/douban?type=anime'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-anime ${
                  isDoubanActive('anime') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Cat className='h-4 w-4' />
                <span>动漫</span>
              </Link>
              <Link
                href='/douban?type=show'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-show ${
                  isDoubanActive('show') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Clover className='h-4 w-4' />
                <span>综艺</span>
              </Link>
              {/* <Link
                href='/live'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip chip-glow chip-theme chip-live ${
                  isActive('/live') ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                <Radio className='h-4 w-4' />
                <span>直播</span>
              </Link>
			  */}
            </div>

            {/* Right: Theme + User */}
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              <UserMenu />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
