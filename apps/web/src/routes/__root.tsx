import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@workspace/ui/globals.css?url"
import { Toaster } from "@workspace/ui/components/sonner"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "EnderShop",
      },
      {
        name: "description",
        content:
          "Buy Minecraft ranks and perks. Permissions are granted automatically, usually within seconds.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
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
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
