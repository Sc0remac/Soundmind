// components/BrandNav.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
} from "@nextui-org/react";
import {
  BarChart3,
  Music2,
  NotebookPen,
  CalendarClock,
  SmilePlus,
} from "lucide-react";

const items = [
  { href: "/log-workout", label: "Log Workout", icon: NotebookPen },
  { href: "/mood/new", label: "Log Mood", icon: SmilePlus },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/music", label: "Music", icon: Music2 },
  { href: "/insights", label: "Insights", icon: BarChart3 },
];

export default function BrandNav() {
  const pathname = usePathname();

  return (
    <Navbar maxWidth="xl" isBordered className="mb-6 rounded-xl2 shadow-card">
      <NavbarBrand>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo-final.png"
            alt="Soundmind"
            width={28}
            height={28}
            className="rounded-lg"
            priority
          />
          <span className="font-semibold tracking-tight">Soundmind</span>
        </Link>
      </NavbarBrand>

      <NavbarContent justify="center" className="hidden md:flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <NavbarItem key={href} isActive={active} className="mx-1">
              <Link
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                ${active ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100"}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex">
          <Link href="/profile">
            <Button size="sm" variant="flat">Profile</Button>
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

