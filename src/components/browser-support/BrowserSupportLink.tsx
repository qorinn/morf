import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button";
import { commonMessages } from "@/i18n/common";
import { getMessages } from "@/i18n/types";
import type { Locale } from "@/lib/locale";

interface Props {
  locale?: Locale;
}

export function BrowserSupportLink({ locale = "hu" }: Props) {
  const copy = getMessages(commonMessages, locale);

  return (
    <a href="/bongeszo-tamogatas" className={buttonVariants({ variant: "outline", size: "sm" })}>
      {copy.browserSupport.linkLabel}
      <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" strokeWidth={2} />
    </a>
  );
}
