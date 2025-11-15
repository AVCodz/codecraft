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
              <stop
                offset="0%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="1"
              ></stop>
              <stop
                offset="100%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="0.5"
              ></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient2"
              x1="650"
              y1="120"
              x2="800"
              y2="300"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="1"
              ></stop>
              <stop
                offset="100%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="0.5"
              ></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient3"
              x1="250"
              y1="380"
              x2="400"
              y2="400"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="1"
              ></stop>
              <stop
                offset="100%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="0.5"
              ></stop>
            </linearGradient>
            <linearGradient
              id="traceGradient4"
              x1="650"
              y1="120"
              x2="500"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="1"
              ></stop>
              <stop
                offset="100%"
                className="[stop-color:hsl(var(--primary))]"
                stopOpacity="0.5"
              ></stop>
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
                  className="stroke-muted-foreground/20 stroke-[0.5]"
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
                  className="stroke-muted-foreground/20 stroke-[0.5]"
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
              className="fill-card stroke-border stroke-2"
              style={{ filter: "drop-shadow(0 0 10px rgba(0, 0, 0, 0.3))" }}
            />
            <rect
              x="250"
              y="120"
              width="400"
              height="30"
              rx="8"
              ry="8"
              className="fill-muted opacity-80"
            />
            <text
              x="294"
              y="140"
              textAnchor="middle"
              className="fill-muted-foreground  font-mono"
              fontSize="12"
            >
              Loading...
            </text>

            <rect
              x="270"
              y="160"
              width="360"
              height="20"
              rx="4"
              className="fill-muted animate-pulse"
            />
            <rect
              x="270"
              y="190"
              width="200"
              height="15"
              rx="4"
              className="fill-muted animate-pulse"
              style={{ animationDelay: "0.1s" }}
            />
            <rect
              x="270"
              y="215"
              width="300"
              height="15"
              rx="4"
              className="fill-muted animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <rect
              x="270"
              y="240"
              width="360"
              height="90"
              rx="4"
              className="fill-muted animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
            <rect
              x="270"
              y="340"
              width="180"
              height="20"
              rx="4"
              className="fill-muted animate-pulse"
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
              fill="none"
              strokeWidth="2"
              opacity="1"
              className="stroke-primary [filter:drop-shadow(0_0_12px_hsl(var(--primary)))]"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                animation: "flow 5s linear infinite",
              }}
            />
            <path
              d="M800 200 H650 V380"
              fill="none"
              strokeWidth="2"
              opacity="1"
              className="stroke-primary [filter:drop-shadow(0_0_12px_hsl(var(--primary)))]"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                animation: "flow 5s linear infinite",
              }}
            />
            <path
              d="M400 520 V380 H250"
              fill="none"
              strokeWidth="2"
              opacity="1"
              className="stroke-primary [filter:drop-shadow(0_0_12px_hsl(var(--primary)))]"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                animation: "flow 5s linear infinite",
              }}
            />
            <path
              d="M500 50 V120 H650"
              fill="none"
              strokeWidth="2"
              opacity="1"
              className="stroke-primary [filter:drop-shadow(0_0_12px_hsl(var(--primary)))]"
              style={{
                strokeDasharray: "120 600",
                strokeDashoffset: 720,
                strokeLinejoin: "round",
                animation: "flow 5s linear infinite",
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
