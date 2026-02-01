export function BillSDKLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 512 512" fill="none">
      <rect width="512" height="512" fill="currentColor" opacity="0.15" />
      <text
        x="256"
        y="256"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="384"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fill="currentColor"
      >
        B
      </text>
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M12 4L4 12M4 4L12 12" />
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
      }}
    >
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}
