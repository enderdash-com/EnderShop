import { HeadContent, Scripts } from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { Providers } from "@/components/providers"

export function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Providers>
            {children}
            <Toaster position="bottom-right" />
          </Providers>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
