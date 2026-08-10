import { Panel } from './ui/panel';
import { chapters } from '../data/chapters';

interface ChapterSidebarProps {
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function ChapterSidebar({ activeId, onSelect }: ChapterSidebarProps) {
  return (
    <div className="absolute top-4 right-4 z-20 w-64 md:w-72">
      <Panel className="max-h-[calc(100vh-8rem)] overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/52 mb-3">
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
                  'text-left rounded-lg px-3 py-2 transition-all border ' +
                  (active
                    ? 'bg-white/10 border-[#cc5a28]/70'
                    : 'bg-white/0 border-white/5 hover:bg-white/5 hover:border-white/10')
                }
              >
                <p
                  className={
                    'text-sm font-medium ' +
                    (active ? 'text-white' : 'text-white/86')
                  }
                >
                  {ch.title}
                </p>
                <p className="mt-1 text-xs text-white/48 line-clamp-2">
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
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/52 mb-1">
                    Scene notes
                  </p>
                  <p className="text-sm text-white/72">{active.summary}</p>
                  <ul className="mt-2 space-y-1.5">
                    {active.bullets.map((b) => (
                      <li
                        key={b}
                        className="text-xs text-white/48 flex gap-2"
                      >
                        <span className="mt-[5px] h-[4px] w-[4px] rounded-full bg-[#cc5a28]" />
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