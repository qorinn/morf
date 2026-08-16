import { BrowserSupportLink } from "./BrowserSupportLink";
import type { Locale } from "@/lib/locale";

interface Props {
  locale?: Locale;
}

export function BrowserSupportHint({ locale = "hu" }: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <BrowserSupportLink locale={locale} />
    </div>
  );
}
