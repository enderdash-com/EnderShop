import { Link as RouterLink, useNavigate } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import type { ComponentProps, ReactNode } from "react"

import { AuthProvider } from "@/components/auth/auth-provider"
import { authClient } from "@/lib/auth-client"
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin"
import { themePlugin } from "@/lib/auth/theme-plugin"

type RouterLinkProps = ComponentProps<typeof RouterLink>

function AuthLink({
  href,
  to,
  className,
  children,
  ...rest
}: {
  href?: string
  to?: string
  className?: string
  children?: ReactNode
} & Omit<RouterLinkProps, "to">) {
  const target = (href ?? to ?? "/") as RouterLinkProps["to"]
  return (
    <RouterLink {...rest} className={className} to={target}>
      {children}
    </RouterLink>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  return (
    <AuthProvider
      Link={AuthLink}
      authClient={authClient}
      // oxlint-disable-next-line react/hooks -- the theme plugin takes the hook and calls it during render
      plugins={[deleteUserPlugin(), themePlugin({ useTheme })]}
      emailAndPassword={{ enabled: true, confirmPassword: true }}
      navigate={(options) => {
        void navigate({ to: options.to, replace: options.replace })
      }}
      redirectTo="/"
    >
      {children}
    </AuthProvider>
  )
}

declare module "@better-auth-ui/core" {
  interface AuthConfig {
    AuthClient: typeof authClient
  }
}
