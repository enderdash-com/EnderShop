import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import type { BetterFetchError } from "better-auth/react"

export function ErrorToaster() {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.getQueryCache().config.onError = (error) => {
      const err = error as BetterFetchError
      if (err?.error) toast.error(err.error.message)
    }

    queryClient.setMutationDefaults([], {
      onError: (error) => {
        toast.error(
          (error as BetterFetchError)?.error?.message || error.message
        )
      }
    })
  }, [queryClient])

  return null
}
