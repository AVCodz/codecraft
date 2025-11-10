"use client";

export function DevServerLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden bg-background relative">
      {/* Grid Background */}
      <svg
        viewBox="0 0 900 900"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <g id="grid">
          <g>
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600].map((x) => (
              <line
                key={`v-${x}`}
                x1={x}
                y1="0"
                x2={x}
                y2="100%"
                className="stroke-neutral-800 stroke-[0.5]"
              />
            ))}
          </g>
          <g>
            {[100, 200, 300, 400, 500, 600, 700, 800].map((y) => (
              <line
                key={`h-${y}`}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                className="stroke-neutral-800 stroke-[0.5]"
              />
            ))}
          </g>
        </g>
      </svg>

      {/* Loader Content */}
      <div className="relative z-10 flex flex-col items-center">
        <svg viewBox="0 0 240 240" height="240" width="240" className="w-24 h-24">
          <circle
            strokeLinecap="round"
            strokeDashoffset="-330"
            strokeDasharray="0 660"
            strokeWidth="20"
            stroke="currentColor"
            fill="none"
            r="105"
            cy="120"
            cx="120"
            className="text-primary animate-ring-a"
          />
          <circle
            strokeLinecap="round"
            strokeDashoffset="-110"
            strokeDasharray="0 220"
            strokeWidth="20"
            stroke="currentColor"
            fill="none"
            r="35"
            cy="120"
            cx="120"
            className="text-neutral-500 animate-ring-b"
          />
          <circle
            strokeLinecap="round"
            strokeDasharray="0 440"
            strokeWidth="20"
            stroke="currentColor"
            fill="none"
            r="70"
            cy="120"
            cx="85"
            className="text-neutral-600 animate-ring-c"
          />
          <circle
            strokeLinecap="round"
            strokeDasharray="0 440"
            strokeWidth="20"
            stroke="currentColor"
            fill="none"
            r="70"
            cy="120"
            cx="155"
            className="text-primary animate-ring-d"
          />
        </svg>

        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Starting Dev Server
          </h3>
          <p className="text-sm text-muted-foreground">
            Please wait while we prepare your preview...
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes ringA {
          from, 4% {
            stroke-dasharray: 0 660;
            stroke-width: 20;
            stroke-dashoffset: -330;
          }
          12% {
            stroke-dasharray: 60 600;
            stroke-width: 30;
            stroke-dashoffset: -335;
          }
          32% {
            stroke-dasharray: 60 600;
            stroke-width: 30;
            stroke-dashoffset: -595;
          }
          40%, 54% {
            stroke-dasharray: 0 660;
            stroke-width: 20;
            stroke-dashoffset: -660;
          }
          62% {
            stroke-dasharray: 60 600;
            stroke-width: 30;
            stroke-dashoffset: -665;
          }
          82% {
            stroke-dasharray: 60 600;
            stroke-width: 30;
            stroke-dashoffset: -925;
          }
          90%, to {
            stroke-dasharray: 0 660;
            stroke-width: 20;
            stroke-dashoffset: -990;
          }
        }

        @keyframes ringB {
          from, 12% {
            stroke-dasharray: 0 220;
            stroke-width: 20;
            stroke-dashoffset: -110;
          }
          20% {
            stroke-dasharray: 20 200;
            stroke-width: 30;
            stroke-dashoffset: -115;
          }
          40% {
            stroke-dasharray: 20 200;
            stroke-width: 30;
            stroke-dashoffset: -195;
          }
          48%, 62% {
            stroke-dasharray: 0 220;
            stroke-width: 20;
            stroke-dashoffset: -220;
          }
          70% {
            stroke-dasharray: 20 200;
            stroke-width: 30;
            stroke-dashoffset: -225;
          }
          90% {
            stroke-dasharray: 20 200;
            stroke-width: 30;
            stroke-dashoffset: -305;
          }
          98%, to {
            stroke-dasharray: 0 220;
            stroke-width: 20;
            stroke-dashoffset: -330;
          }
        }

        @keyframes ringC {
          from {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: 0;
          }
          8% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -5;
          }
          28% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -175;
          }
          36%, 58% {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: -220;
          }
          66% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -225;
          }
          86% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -395;
          }
          94%, to {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: -440;
          }
        }

        @keyframes ringD {
          from, 8% {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: 0;
          }
          16% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -5;
          }
          36% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -175;
          }
          44%, 50% {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: -220;
          }
          58% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -225;
          }
          78% {
            stroke-dasharray: 40 400;
            stroke-width: 30;
            stroke-dashoffset: -395;
          }
          86%, to {
            stroke-dasharray: 0 440;
            stroke-width: 20;
            stroke-dashoffset: -440;
          }
        }

        :global(.animate-ring-a) {
          animation: ringA 2s linear infinite;
        }

        :global(.animate-ring-b) {
          animation: ringB 2s linear infinite;
        }

        :global(.animate-ring-c) {
          animation: ringC 2s linear infinite;
        }

        :global(.animate-ring-d) {
          animation: ringD 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
