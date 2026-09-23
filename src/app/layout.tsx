import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FaciliAI — 会議ファシリテーション',
  description: '会議の発言をリアルタイムに解析し、意味的なマインドマップを構築するAIファシリテーター',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
