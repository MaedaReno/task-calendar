"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, LayoutDashboard, Settings } from "lucide-react";

const links = [
  { href: "/", label: "今日", icon: LayoutDashboard },
  { href: "/tasks", label: "タスク", icon: ListTodo },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-slate-900 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent mr-6">
          AI Calendar
        </span>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${pathname === href
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
