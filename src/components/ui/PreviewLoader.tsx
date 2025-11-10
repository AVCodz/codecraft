"use client";

export function PreviewLoader() {
  return (
    <div className="flex justify-center items-center h-full w-full overflow-hidden bg-background">
      <div className="w-full h-full">
        <svg
          viewBox="0 0 900 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient
              id="traceGradient1"
              x1="250"
              y1="120"
              x2="100"
              y2="200"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00ccff" stopOpacity="1"></stop>
              <stop offset="100%" stopColor="#00ccff" stopOpacity="0.5"></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient2"
              x1="650"
              y1="120"
              x2="800"
              y2="300"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00ccff" stopOpacity="1"></stop>
              <stop offset="100%" stopColor="#00ccff" stopOpacity="0.5"></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient3"
              x1="250"
              y1="380"
              x2="400"
              y2="400"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00ccff" stopOpacity="1"></stop>
              <stop offset="100%" stopColor="#00ccff" stopOpacity="0.5"></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient4"
              x1="650"
              y1="120"
              x2="500"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00ccff" stopOpacity="1"></stop>
              <stop offset="100%" stopColor="#00ccff" stopOpacity="0.5"></stop>
            </linearGradient>
          </defs>

          <g id="grid">
            <g>
              {[
                0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100,
                1200, 1300, 1400, 1500, 1600,
              ].map((x) => (
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

          <g id="browser" transform="translate(0, 200)">
            <rect
              x="250"
              y="120"
              width="400"
              height="260"
              rx="8"
              ry="8"
              className="fill-neutral-950 stroke-neutral-600"
              style={{ filter: "drop-shadow(0 0 10px rgba(0, 0, 0, 0.9))" }}
            />
            <rect
              x="250"
              y="120"
              width="400"
              height="30"
              rx="8"
              ry="8"
              className="fill-neutral-900"
            />
            <text
              x="294"
              y="140"
              textAnchor="middle"
              className="fill-neutral-200 text-sm font-mono"
            >
              Loading...
            </text>

            <rect
              x="270"
              y="160"
              width="360"
              height="20"
              rx="4"
              className="fill-neutral-800 animate-pulse"
            />
            <rect
              x="270"
              y="190"
              width="200"
              height="15"
              rx="4"
              className="fill-neutral-800 animate-pulse"
              style={{ animationDelay: "0.1s" }}
            />
            <rect
              x="270"
              y="215"
              width="300"
              height="15"
              rx="4"
              className="fill-neutral-800 animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <rect
              x="270"
              y="240"
              width="360"
              height="90"
              rx="4"
              className="fill-neutral-800 animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
            <rect
              x="270"
              y="340"
              width="180"
              height="20"
              rx="4"
              className="fill-neutral-800 animate-pulse"
              style={{ animationDelay: "0.4s" }}
            />
          </g>

          <g
            id="traces"
            transform="translate(0, 200)"
            className="animate-trace"
          >
            <path
              d="M100 300 H250 V120"
              className="fill-none stroke-[url(#traceGradient1)] stroke-[1] opacity-95"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                filter: "drop-shadow(0 0 8px currentColor) blur(0.5px)",
                animation: "flow 5s linear infinite",
                color: "#00ccff",
              }}
            />
            <path
              d="M800 200 H650 V380"
              className="fill-none stroke-[url(#traceGradient2)] stroke-[1] opacity-95"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                filter: "drop-shadow(0 0 8px currentColor) blur(0.5px)",
                animation: "flow 5s linear infinite",
                color: "#00ccff",
              }}
            />
            <path
              d="M400 520 V380 H250"
              className="fill-none stroke-[url(#traceGradient3)] stroke-[1] opacity-95"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                filter: "drop-shadow(0 0 8px currentColor) blur(0.5px)",
                animation: "flow 5s linear infinite",
                color: "#00ccff",
              }}
            />
            <path
              d="M500 50 V120 H650"
              className="fill-none stroke-[url(#traceGradient4)] stroke-[1] opacity-95"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                filter: "drop-shadow(0 0 8px currentColor) blur(0.5px)",
                animation: "flow 5s linear infinite",
                color: "#00ccff",
              }}
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        @keyframes flow {
          from {
            stroke-dashoffset: 720;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
