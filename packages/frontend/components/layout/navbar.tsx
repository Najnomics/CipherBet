"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { ConnectButton } from "@/components/ui/connect-button";

const NAV_LINKS = [
  { href: "/", label: "Arena" },
  { href: "/create", label: "Create" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="nav-bar">
      <Link href="/" className="nav-logo">
        <svg className="nav-logo-icon" viewBox="0 0 28 28" aria-hidden>
          <polygon points="14,2 26,9 26,19 14,26 2,19 2,9" fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
          <polygon points="14,6 22,11 22,17 14,22 6,17 6,11" fill="none" stroke="var(--amber)" strokeWidth="1" opacity="0.6" />
          <circle cx="14" cy="14" r="3" fill="var(--cyan)" opacity="0.8" />
        </svg>
        <span className="nav-logo-text">CipherBet</span>
      </Link>

      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx("nav-link", pathname === link.href && "nav-link--active")}
          >
            {link.label}
            {pathname === link.href && (
              <motion.span className="nav-link-indicator" layoutId="nav-indicator" />
            )}
          </Link>
        ))}
      </div>

      <ConnectButton />
    </nav>
  );
}
