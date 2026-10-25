import { useAuth, useSession } from "@better-auth-ui/react"
import { LogIn, UserPlus2, UserRound } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { UserButton } from "@/components/auth/user/user-button"
import { authClient } from "@/lib/auth-client"

export function UserMenu() {
  const { data: session, isPending } = useSession(authClient)
  const { basePaths, viewPaths, localization, Link } = useAuth()

  if (isPending || (session && !session.user.isAnonymous)) {
    return <UserButton align="end" size="icon" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={localization.auth.account}
          />
        }
      >
        <UserRound />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link href={`${basePaths.auth}/${viewPaths.auth.signIn}`} />
            }
          >
            <LogIn />
            {localization.auth.signIn}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link href={`${basePaths.auth}/${viewPaths.auth.signUp}`} />
            }
          >
            <UserPlus2 />
            {localization.auth.signUp}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
