import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body className="font-sans text-gray-900">{children}</body></html>;
}
