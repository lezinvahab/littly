import { Menu, Plus } from "lucide-react";

interface TopBarProps {
  title: string;
  onOpenSidebar: () => void;
  onNewChat: () => void;
}

export function BabyCareHeader({ title, onOpenSidebar, onNewChat }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-porcelain/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open chat history"
          className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-pine-800 md:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <img
          src="/logo/littly-icon.svg"
          alt=""
          aria-hidden="true"
          width={34}
          height={32}
          className="h-8 w-auto shrink-0"
          draggable={false}
        />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-stone-900">
          {title}
        </p>

        <button
          type="button"
          onClick={onNewChat}
          aria-label="Start a new chat"
          title="New chat"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 transition hover:border-pine-800/40 hover:text-pine-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-800"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>
    </header>
  );
}
