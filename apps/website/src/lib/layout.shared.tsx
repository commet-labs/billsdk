import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center text-xl gap-2">
          <span>billSDK</span>
        </div>
      ),
      transparentMode: "always",
    },
  };
}
