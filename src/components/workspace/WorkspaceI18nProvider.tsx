import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/lib/locale";

type WorkspaceI18nValue<TMessages> = { locale: Locale; messages: TMessages };

const WorkspaceI18nContext = createContext<WorkspaceI18nValue<unknown> | null>(null);

/** Shared typed i18n boundary for all React workspaces. */
export function WorkspaceI18nProvider<TMessages>({
  locale,
  messages,
  children,
}: WorkspaceI18nValue<TMessages> & { children: ReactNode }) {
  return <WorkspaceI18nContext.Provider value={{ locale, messages }}>{children}</WorkspaceI18nContext.Provider>;
}

export function useWorkspaceI18n<TMessages>() {
  const value = useContext(WorkspaceI18nContext);
  if (!value) throw new Error("A workspace i18n provider hiányzik.");
  return value as WorkspaceI18nValue<TMessages>;
}
