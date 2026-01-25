import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/logo.svg"
        alt="BillSDK"
        width={size}
        height={size}
        className="rounded"
      />
      {showText && <span className="font-semibold text-lg">BillSDK</span>}
    </Link>
  );
}
