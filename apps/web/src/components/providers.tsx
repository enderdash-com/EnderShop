import type {
  AuthPluginComponents,
  AuthPlugin as AuthPluginPrimitive,
} from "@better-auth-ui/react"
import { Link as RouterLink, useNavigate } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import type { ComponentProps, ReactNode } from "react"

import { AuthProvider } from "@/components/auth/auth-provider"
import { authClient } from "@/lib/auth-client"
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin"
import { themePlugin } from "@/lib/auth/theme-plugin"

type RouterLinkProps = ComponentProps<typeof RouterLink>

function useAuthTheme() {
  const { theme, setTheme, themes } = useTheme()
  return { setTheme, themes, ...(theme === undefined ? {} : { theme }) }
}

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
  const target = href ?? to ?? "/"
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
      plugins={[deleteUserPlugin(), themePlugin({ useTheme: useAuthTheme })]}
      emailAndPassword={{ enabled: true, confirmPassword: true }}
      navigate={(options) => {
        const { to, replace } = options
        void navigate({ to, ...(replace === undefined ? {} : { replace }) })
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

declare module "@better-auth-ui/core" {
  /** Widens `useAuth().plugins` to the shadcn-typed `AuthPlugin`. */
  interface AuthPluginRegister {
    shadcn: AuthPlugin
  }
}

/** Props the shadcn `<Auth>` router spreads onto plugin-contributed auth views. */
interface AuthViewProps {
  className?: string
  socialLayout?: "auto" | "horizontal" | "vertical" | "grid"
  socialPosition?: "top" | "bottom"
}

/** Props the shadcn `<Settings>` router spreads onto plugin-contributed settings views. */
interface SettingsViewProps {
  className?: string
}

type AuthPlugin = AuthPluginPrimitive<
  AuthPluginComponents,
  AuthViewProps,
  SettingsViewProps
>
