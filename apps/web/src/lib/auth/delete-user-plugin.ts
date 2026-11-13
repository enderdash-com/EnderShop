import { createAuthPlugin } from "@better-auth-ui/core"
import { deleteUserPlugin as coreDeleteUserPlugin } from "@better-auth-ui/core/plugins/delete-user"
import { DangerZone } from "@/components/auth/delete-user/danger-zone"
import type { DeleteUserPluginOptions } from "@better-auth-ui/core/plugins/delete-user"

export const deleteUserPlugin = createAuthPlugin(
  coreDeleteUserPlugin.id,
  (options: DeleteUserPluginOptions = {}) => ({
    ...coreDeleteUserPlugin(options),
    securityCards: [DangerZone],
  })
)
