import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="BillSDK" width={28} height={28} />
          <span>BillSDK</span>
        </div>
      ),
      transparentMode: "always",
    },
  };
}
