import { useLocation, Link } from "wouter";
import { Home, PlusCircle, BarChart2, FileText, Sparkles } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/record", icon: PlusCircle, label: "기록" },
  { href: "/chat", icon: Sparkles, label: "AI코칭" },
  { href: "/dashboard", icon: BarChart2, label: "통계" },
  { href: "/portfolio", icon: FileText, label: "포트폴리오" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="bottom-nav no-print">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`nav-${label}`}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 touch-target ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "scale-110 transition-transform" : ""}
                />
                <span className={`text-[11px] font-medium ${isActive ? "text-primary" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
