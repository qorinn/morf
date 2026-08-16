import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";
import { isBrowserSupportError } from "@/lib/browser-support";

export function useErrorToast(error: string | undefined, title = "Nem sikerült folytatni") {
  const lastErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = undefined;
      return;
    }
    if (lastErrorRef.current === error) return;

    lastErrorRef.current = error;
    const browserSupport = isBrowserSupportError(error);
    toast.add({
      type: "error",
      title,
      description: error,
      actionProps: browserSupport
        ? {
            children: "Böngészők",
            onClick: () => {
              window.location.assign("/bongeszo-tamogatas");
            },
          }
        : undefined,
    });
  }, [error, title]);
}
