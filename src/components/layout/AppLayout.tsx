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
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header isOnline={isOnline} materialsVersion={materialsVersion} />
      <div className="flex min-h-0 flex-1">
        <Sidebar current={screen} onSelect={onNavigate} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
