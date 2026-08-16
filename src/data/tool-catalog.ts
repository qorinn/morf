import {
  BrowserIcon,
  Film01Icon,
  Image02Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import { getMessages } from "@/i18n/types";
import { toolMessages, type ToolId } from "@/i18n/tools";
import type { Locale } from "@/lib/locale";
import { getLocalizedRoute, type LocalizedRouteId } from "@/lib/localized-routes";

const toolDefinitions: Array<{ id: ToolId; route: LocalizedRouteId; icon: typeof Image02Icon }> = [
  {
    id: "imageConverter",
    route: "imageConverter",
    icon: Image02Icon,
  },
  {
    id: "videoFrames",
    route: "videoFrames",
    icon: Film01Icon,
  },
  {
    id: "videoSpeed",
    route: "videoSpeed",
    icon: Film01Icon,
  },
  {
    id: "videoConverter",
    route: "videoConverter",
    icon: Film01Icon,
  },
  {
    id: "sharePreview",
    route: "sharePreview",
    icon: Share01Icon,
  },
  {
    id: "faviconGenerator",
    route: "faviconGenerator",
    icon: BrowserIcon,
  },
];

export function getTools(locale: Locale = "hu") {
  const copy = getMessages(toolMessages, locale);
  return toolDefinitions.map(({ id, route, ...definition }) => ({
    id,
    ...definition,
    href: getLocalizedRoute(route, locale),
    ...copy[id],
  }));
}

/** Magyar kompatibilitási export a már elkészült oldalakhoz. */
export const tools = getTools();
