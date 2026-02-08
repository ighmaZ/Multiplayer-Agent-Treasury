'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, Landmark, FileText } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Pay Invoice', icon: FileText },
    { href: '/treasury', label: 'Treasury', icon: Landmark },
  ];

  return (
    <aside className="hidden h-screen w-[280px] flex-col bg-[#0f0f10] text-zinc-400 md:flex">
      {/* Header / Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Image
          src="/v2logo.png"
          alt="Tresora Logo"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg invert"
        />
        <span className="font-semibold text-white">Tresora</span>
      </div>

      {/* Main Actions */}
      <div className="px-3 py-2">
        <Link
          href="/"
          className="group flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={16} />
            <span>New request</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300">
            <span className="text-[10px]">⌘</span>
            <span>N</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : "hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ccf437]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3 pb-4">
        <div className="rounded-xl bg-zinc-900 p-4">
          <div className="mb-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Treasury Wallet
          </div>
          <div className="text-xs font-mono text-zinc-400 truncate">
            0x6a75329f...e16882
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-500">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
