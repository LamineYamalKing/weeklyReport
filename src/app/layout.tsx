import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TimerProvider } from "@/components/TimerProvider";
import FloatingTimer from "@/components/FloatingTimer";

export const metadata: Metadata = {
  title: "周报工具",
  description: "个人工作日志与周报生成工具",
};

const navItems = [
  { href: "/logs", label: "工作日志", icon: "📝" },
  { href: "/tags", label: "标签管理", icon: "🏷️" },
  { href: "/report", label: "周报", icon: "📊" },
  { href: "/stats", label: "统计", icon: "📈" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans antialiased">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <span className="text-xl">📋</span>
                <span className="hidden sm:inline">周报工具</span>
              </Link>
              <nav className="flex items-center gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>
        {/* 计时器全局 Provider */}
        <TimerProvider>
          {/* 浮动计时器 */}
          <FloatingTimer />
          {/* 主内容区 */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
            {children}
          </main>
        </TimerProvider>
      </body>
    </html>
  );
}
