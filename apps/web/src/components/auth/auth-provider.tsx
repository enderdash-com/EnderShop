import {
  AuthProvider as AuthProviderPrimitive
  
} from "@better-auth-ui/react"
import { ErrorToaster } from "./error-toaster"
import type {AuthProviderProps} from "@better-auth-ui/react";


/**
 * Provides an authentication context by rendering an auth provider with the sonner toast handler injected, forwarding remaining configuration and rendering `children` inside it.
 *
 * @param children - React nodes to render inside the authentication provider
 * @returns A React element that renders an authentication provider configured with the provided props and toast handler
 */
export function AuthProvider({ children, ...config }: AuthProviderProps) {
  return (
    <AuthProviderPrimitive {...config}>
      {children}

      <ErrorToaster />
    </AuthProviderPrimitive>
  )
}
