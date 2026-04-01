import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

function CommetLogo() {
  return (
    <svg width="18" height="18" viewBox="143 71 214 369" aria-label="Commet">
      <path
        d="M250 71L356.521 255.5H143.479L250 71Z"
        className="fill-foreground"
      />
      <path
        d="M250 440L356.521 255.5H143.479L250 440Z"
        className="fill-foreground"
      />
      <rect
        width="253.649"
        height="17.0192"
        transform="matrix(0.718749 0.695269 -0.64697 0.762515 143.458 243.867)"
        className="fill-background"
      />
    </svg>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <CommetLogo />,
      url: "https://commet.co",
      children: (
        <div className="flex items-center gap-3">
          <div className="h-4 w-px shrink-0 bg-fd-border" />
          <a href="/" className="text-sm font-medium hover:text-foreground/80">
            billSDK
          </a>
        </div>
      ),
      transparentMode: "always",
    },
  };
}
