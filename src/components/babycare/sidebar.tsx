"use client";

import { MessageSquareText, Plus, Trash2, X } from "lucide-react";
import type { Conversation } from "@/types/babycare";
import { LittlyWordmark } from "@/components/babycare/littly-wordmark";
import { cn } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  openOnMobile: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  openOnMobile,
  onSelect,
  onNewChat,
  onDelete,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        aria-hidden={!openOnMobile}
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-30 bg-stone-900/40 transition-opacity md:hidden",
          openOnMobile ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Chat history"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-parchment transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          openOnMobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand + new chat */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <img
            src="/logo/littly-icon.svg"
            alt=""
            aria-hidden="true"
            width={38}
            height={35}
            className="h-9 w-auto shrink-0"
            draggable={false}
          />
          <div className="min-w-0 flex-1 leading-none">
            <LittlyWordmark className="text-[22px] font-semibold tracking-tight" />
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close chat history"
            className="self-start rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-pine-800 md:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-pine-800 px-4 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(15,77,58,0.3)] transition hover:bg-pine-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-800 active:scale-[0.99]"
          >
            <Plus className="size-4" aria-hidden="true" />
            New chat
          </button>
        </div>

        {/* History list */}
        <nav aria-label="Previous chats" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] leading-relaxed text-stone-500">
              No chats yet.
              <br />
              Your conversations will appear here.
            </p>
          ) : (
            <ul className="grid gap-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeId;
                return (
                  <li key={conversation.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={isActive ? "true" : undefined}
                      title={conversation.title}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-pine-800",
                        isActive
                          ? "bg-white font-medium text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-brass-500/50"
                          : "text-stone-600 hover:bg-white/70 hover:text-stone-900",
                      )}
                    >
                      <MessageSquareText
                        className="size-4 shrink-0 text-stone-400"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {conversation.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation.id)}
                      aria-label={`Delete chat "${conversation.title}"`}
                      title="Delete chat"
                      className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition group-hover:block hover:bg-red-50 hover:text-red-700 focus-visible:block focus-visible:outline-2 focus-visible:outline-pine-800"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <p className="border-t border-stone-900/10 px-4 py-3 text-[11px] leading-relaxed text-stone-500">
          Chats are saved on this device only.
        </p>
      </aside>
    </>
  );
}
