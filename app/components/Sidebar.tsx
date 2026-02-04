import { 
  MessageSquarePlus, 
  Search, 
  Users, 
  HelpCircle, 
  Settings, 
  LogOut, 
  Zap,
  Command
} from "lucide-react";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[280px] flex-col bg-[#0f0f10] text-zinc-400 md:flex">
      {/* Header / Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
          <Command size={18} />
        </div>
        <span className="font-semibold text-white">CFO Agent</span>
        <button className="ml-auto text-zinc-500 hover:text-white">
          <span className="sr-only">Toggle Sidebar</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      </div>

      {/* Main Actions */}
      <div className="px-3 py-2">
        <button className="group flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-800 hover:text-white">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={16} />
            <span>New chat</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300">
            <span className="text-[10px]">⌘</span>
            <span>N</span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-900 hover:text-white">
          <Search size={18} />
          <span>Search chat</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-900 hover:text-white">
          <Users size={18} />
          <span>Community</span>
        </button>

        <div className="mt-6">
          <div className="mb-2 px-3 text-xs font-medium text-zinc-500">
            Recent
          </div>
          <div className="space-y-1">
            <button className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-900 hover:text-white">
              Quick access to your latest...
            </button>
            <button className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-900 hover:text-white">
              Pick up right where you le...
            </button>
          </div>
        </div>
      </nav>

      {/* Footer / Upgrade */}
      <div className="mt-auto px-3 pb-4">
        <div className="mb-4 rounded-xl bg-zinc-900 p-4">
          <div className="mb-2 text-sm font-medium text-white">
            Your trial ends in 7 days
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Keep enjoying unlimited chats, detailed reports, and premium AI tools without interruption.
          </p>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ccf437] py-2 text-sm font-semibold text-black hover:bg-[#bce427]">
            <Zap size={16} />
            Upgrade
          </button>
        </div>

      
      </div>
    </aside>
  );
}
