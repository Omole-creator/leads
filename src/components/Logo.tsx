import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="JobMingle">
      <Image
        src="/logo.jpg"
        alt="JobMingle"
        width={120}
        height={32}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}
