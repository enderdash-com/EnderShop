import { Link as RouterLink, useNavigate } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import type { ComponentProps, ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import { AuthProvider } from "@/components/auth/auth-provider"

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
  const { theme, setTheme } = useTheme()

  return (
    <AuthProvider
      Link={AuthLink}
      appearance={{ setTheme, theme }}
      authClient={authClient}
      navigate={(options) => {
        navigate({ to: options.to as RouterLinkProps["to"], replace: options.replace })
      }}
      redirectTo="/"
    >
      {children}
    </AuthProvider>
  )
}

declare module "@better-auth-ui/react" {
  interface AuthConfig {
    AuthClient: typeof authClient
  }
}
