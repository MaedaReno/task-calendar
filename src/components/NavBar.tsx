"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListTodo, LayoutDashboard, Settings } from "lucide-react";

const links = [
  { href: "/", label: "今日", icon: LayoutDashboard },
  { href: "/calendar", label: "予定", icon: CalendarDays },
  { href: "/tasks", label: "タスク", icon: ListTodo },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-lg text-indigo-600 mr-4">AI Calendar</span>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${pathname === href
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
