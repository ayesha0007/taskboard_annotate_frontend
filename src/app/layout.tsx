import type { Metadata } from "next";
import { Footer } from "@/components/ui/Footer";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Flowdeck",
  description: "Kanban task management and image annotation in one workspace.",
};
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('tb_theme');
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (prefersLight ? 'light' : 'dark');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="font-body min-h-screen bg-surface text-ink flex flex-col">
        <ThemeProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
