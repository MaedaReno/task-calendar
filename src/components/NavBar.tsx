"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, LayoutDashboard, Settings, Zap } from "lucide-react";

const links = [
  { href: "/", label: "今日", icon: LayoutDashboard },
  { href: "/tasks", label: "タスク", icon: ListTodo },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(8, 12, 24, 0.85)",
        borderColor: "var(--glass-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))" }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className="font-semibold text-sm tracking-tight"
            style={{ background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            AI Calendar
          </span>
        </div>

        {/* Nav links */}
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={
                isActive
                  ? {
                      background: "var(--accent-cyan-dim)",
                      color: "var(--accent-cyan)",
                      border: "1px solid rgba(56,189,248,0.2)",
                    }
                  : {
                      color: "var(--text-muted)",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--glass-bg)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
