import Image from 'next/image';

interface LogoOverlayProps {
  className?: string;
  onClick?: () => void;
}

export function LogoOverlay({ className, onClick }: LogoOverlayProps) {
  const isClickable = !!onClick;

  return (
    <div className={`flex items-center ${className || ''}`}>
      <div className={`relative group ${isClickable ? 'cursor-pointer' : ''}`} onClick={onClick}>
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-orange-400/30 via-orange-500/20 to-orange-600/10 blur-md ${isClickable ? 'group-hover:blur-lg' : ''} transition-all duration-500 animate-pulse`} />

        {/* Main logo container */}
        <div className={`relative rounded-xl bg-white/95 backdrop-blur-sm border-2 border-orange-400/60 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] ${isClickable ? 'group-hover:shadow-[0_12px_48px_rgba(249,115,22,0.4)] group-hover:scale-105' : ''} transition-all duration-500`}>
          {/* Inner highlight */}
          <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-orange-400/5 via-transparent to-gray-400/5 pointer-events-none" />

          {/* Logo image with enhanced styling */}
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-orange-400/30 shadow-inner">
            <Image
              src="/A_Logo.png"
              alt="Reset to Home View"
              width={56}
              height={56}
              className={`w-full h-full object-cover ${isClickable ? 'group-hover:scale-110' : ''} transition-transform duration-500`}
              priority
              unoptimized
            />
            {/* Logo overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 via-transparent to-gray-600/10 pointer-events-none" />
          </div>

          {/* Reset icon overlay for clickable version */}
          {isClickable && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/80">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M4 12a8 8 0 018-8V2.5a.5.5 0 011 0V4a8 8 0 010 16v1.5a.5.5 0 01-1 0V20a8 8 0 01-8-8z" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}

          {/* Subtle animated border */}
          <div className="absolute inset-0 rounded-xl border border-orange-400/20 animate-pulse" />
        </div>

        {/* Floating particles effect */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-bounce opacity-60" />
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce opacity-40" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
  );
}