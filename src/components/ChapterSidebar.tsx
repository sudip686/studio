import { Panel } from './ui/panel';
import { chapters } from '../data/chapters';

interface ChapterSidebarProps {
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function ChapterSidebar({ activeId, onSelect }: ChapterSidebarProps) {
  return (
    <div className="absolute top-6 right-6 z-20 w-64 md:w-72">
      <Panel className="max-h-[80vh] overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 mb-2">
          Chapters
        </p>

        <div className="flex flex-col gap-2">
          {chapters.map((ch) => {
            const active = ch.id === activeId;
            return (
              <button
                key={ch.id}
                onClick={() => onSelect?.(ch.id)}
                className={
                  'text-left rounded-xl px-3 py-2 transition border ' +
                  (active
                    ? 'bg-white/10 border-accent/70'
                    : 'bg-white/0 border-white/5 hover:bg-white/5')
                }
              >
                <p
                  className={
                    'text-xs md:text-sm font-medium ' +
                    (active ? 'text-accent' : 'text-gray-100')
                  }
                >
                  {ch.title}
                </p>
                <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                  {ch.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active chapter details */}
        {activeId && (
          <div className="mt-4 border-t border-white/10 pt-3">
            {(() => {
              const active = chapters.find((c) => c.id === activeId);
              if (!active) return null;
              return (
                <>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Scene notes
                  </p>
                  <p className="text-xs text-gray-300">{active.summary}</p>
                  <ul className="mt-2 space-y-1.5">
                    {active.bullets.map((b) => (
                      <li
                        key={b}
                        className="text-[11px] text-gray-400 flex gap-2"
                      >
                        <span className="mt-[6px] h-[4px] w-[4px] rounded-full bg-accent" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </div>
        )}
      </Panel>
    </div>
  );
}