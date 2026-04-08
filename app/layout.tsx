import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Signal — AI World News",
  description: "AI-powered breaking news, published automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0c0c0c" }}>
        {children}
      </body>
    </html>
  );
}

