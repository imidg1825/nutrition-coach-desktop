import type { ReactNode } from "react";
import type { Screen } from "../../types";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type AppLayoutProps = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  isOnline: boolean;
  materialsVersion: string;
  children: ReactNode;
};

export function AppLayout({
  screen,
  onNavigate,
  isOnline,
  materialsVersion,
  children,
}: AppLayoutProps) {
  const decorVariant =
    screen === "start" || screen === "about"
      ? "hero"
      : screen === "questionnaire" || screen === "building" || screen === "settings"
        ? "quiet"
        : "base";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header isOnline={isOnline} materialsVersion={materialsVersion} />
      <div className="flex min-h-0 flex-1">
        <Sidebar current={screen} onSelect={onNavigate} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className={`app-decor app-decor--${decorVariant}`}>
            <svg
              className="app-leaf app-leaf--tl"
              viewBox="0 0 220 220"
              aria-hidden="true"
            >
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M30 165 C60 120, 110 105, 168 52"
                  stroke="rgba(15,118,110,0.32)"
                  strokeWidth="3"
                />
                <path
                  d="M66 138 C56 116, 58 94, 76 74 C100 48, 130 42, 146 46 C140 66, 124 95, 98 120 C84 134, 74 139, 66 138 Z"
                  fill="rgba(120,199,184,0.28)"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                />
                <path
                  d="M104 112 C96 92, 98 74, 112 58 C132 36, 158 32, 172 36 C168 54, 154 82, 132 104 C120 116, 112 113, 104 112 Z"
                  fill="rgba(99,199,214,0.22)"
                />
                <path
                  d="M52 178 C64 170, 78 162, 90 150 C102 138, 112 124, 122 108"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M46 188 C62 178, 78 166, 90 156"
                  stroke="rgba(244,167,154,0.26)"
                  strokeWidth="3"
                  opacity="0.75"
                />
              </g>
            </svg>
            <svg
              className="app-leaf app-leaf--tr"
              viewBox="0 0 220 220"
              aria-hidden="true"
            >
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M30 165 C60 120, 110 105, 168 52"
                  stroke="rgba(15,118,110,0.32)"
                  strokeWidth="3"
                />
                <path
                  d="M66 138 C56 116, 58 94, 76 74 C100 48, 130 42, 146 46 C140 66, 124 95, 98 120 C84 134, 74 139, 66 138 Z"
                  fill="rgba(120,199,184,0.28)"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                />
                <path
                  d="M104 112 C96 92, 98 74, 112 58 C132 36, 158 32, 172 36 C168 54, 154 82, 132 104 C120 116, 112 113, 104 112 Z"
                  fill="rgba(99,199,214,0.22)"
                />
                <path
                  d="M52 178 C64 170, 78 162, 90 150 C102 138, 112 124, 122 108"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M46 188 C62 178, 78 166, 90 156"
                  stroke="rgba(244,167,154,0.26)"
                  strokeWidth="3"
                  opacity="0.75"
                />
              </g>
            </svg>
            <svg
              className="app-leaf app-leaf--bl"
              viewBox="0 0 220 220"
              aria-hidden="true"
            >
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M30 165 C60 120, 110 105, 168 52"
                  stroke="rgba(15,118,110,0.32)"
                  strokeWidth="3"
                />
                <path
                  d="M66 138 C56 116, 58 94, 76 74 C100 48, 130 42, 146 46 C140 66, 124 95, 98 120 C84 134, 74 139, 66 138 Z"
                  fill="rgba(120,199,184,0.28)"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                />
                <path
                  d="M104 112 C96 92, 98 74, 112 58 C132 36, 158 32, 172 36 C168 54, 154 82, 132 104 C120 116, 112 113, 104 112 Z"
                  fill="rgba(99,199,214,0.22)"
                />
                <path
                  d="M52 178 C64 170, 78 162, 90 150 C102 138, 112 124, 122 108"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M46 188 C62 178, 78 166, 90 156"
                  stroke="rgba(244,167,154,0.26)"
                  strokeWidth="3"
                  opacity="0.75"
                />
              </g>
            </svg>
            <svg
              className="app-leaf app-leaf--br"
              viewBox="0 0 220 220"
              aria-hidden="true"
            >
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M30 165 C60 120, 110 105, 168 52"
                  stroke="rgba(15,118,110,0.32)"
                  strokeWidth="3"
                />
                <path
                  d="M66 138 C56 116, 58 94, 76 74 C100 48, 130 42, 146 46 C140 66, 124 95, 98 120 C84 134, 74 139, 66 138 Z"
                  fill="rgba(120,199,184,0.28)"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                />
                <path
                  d="M104 112 C96 92, 98 74, 112 58 C132 36, 158 32, 172 36 C168 54, 154 82, 132 104 C120 116, 112 113, 104 112 Z"
                  fill="rgba(99,199,214,0.22)"
                />
                <path
                  d="M52 178 C64 170, 78 162, 90 150 C102 138, 112 124, 122 108"
                  stroke="rgba(15,118,110,0.18)"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M46 188 C62 178, 78 166, 90 156"
                  stroke="rgba(244,167,154,0.26)"
                  strokeWidth="3"
                  opacity="0.75"
                />
              </g>
            </svg>
            <div className="relative z-10 mx-auto max-w-5xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
