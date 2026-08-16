import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button";

export function BrowserSupportLink() {
  return (
    <a href="/bongeszo-tamogatas" className={buttonVariants({ variant: "outline", size: "sm" })}>
      Böngészőtámogatás
      <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" strokeWidth={2} />
    </a>
  );
}
