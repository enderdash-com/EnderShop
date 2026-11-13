import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"
import appCss from "@workspace/ui/globals.css?url"
import { Toaster } from "@workspace/ui/components/sonner"
import { Providers } from "@/components/providers"
import type { QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
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
  }
)

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
