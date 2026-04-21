import type { FormEvent } from "react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

interface AuthDialogProps {
  anonymousMode: boolean
  onAuthenticated: () => Promise<void> | void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function AuthDialog({
  anonymousMode,
  onAuthenticated,
  onOpenChange,
  open,
}: AuthDialogProps) {
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpName, setSignUpName] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [isPending, startTransition] = useTransition()

  const defaultTab = useMemo(
    () => (anonymousMode ? "create-account" : "sign-in"),
    [anonymousMode]
  )

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await authClient.signIn.email({
        email: signInEmail.trim(),
        password: signInPassword,
      })

      if (result.error) {
        toast.error(result.error.message || "Could not sign in.")
        return
      }

      toast.success("Signed in.")
      await onAuthenticated()
      onOpenChange(false)
    })
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await authClient.signUp.email({
        email: signUpEmail.trim(),
        name: signUpName.trim(),
        password: signUpPassword,
      })

      if (result.error) {
        toast.error(result.error.message || "Could not create the account.")
        return
      }

      toast.success(
        anonymousMode
          ? "Guest account linked successfully."
          : "Account created."
      )
      await onAuthenticated()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {anonymousMode ? "Link your guest account" : "Account access"}
          </DialogTitle>
          <DialogDescription>
            {anonymousMode
              ? "Keep your guest purchases and profile, then attach them to an email and password."
              : "Use a full account to keep your purchases, profile, and subscription access in one place."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList variant="line">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="create-account">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="sign-in">
            <form className="flex flex-col gap-6" onSubmit={handleSignIn}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                  <Input
                    id="sign-in-email"
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) => setSignInEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={signInEmail}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
                  <Input
                    id="sign-in-password"
                    autoComplete="current-password"
                    onChange={(event) => setSignInPassword(event.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={signInPassword}
                  />
                  <FieldDescription>
                    Sign in to manage purchases and subscription status.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <Button disabled={isPending} type="submit">
                {isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="create-account">
            <form className="flex flex-col gap-6" onSubmit={handleSignUp}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
                  <Input
                    id="sign-up-name"
                    autoComplete="name"
                    onChange={(event) => setSignUpName(event.target.value)}
                    placeholder="Server owner"
                    value={signUpName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
                  <Input
                    id="sign-up-email"
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) => setSignUpEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={signUpEmail}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
                  <Input
                    id="sign-up-password"
                    autoComplete="new-password"
                    onChange={(event) => setSignUpPassword(event.target.value)}
                    placeholder="Choose a strong password"
                    type="password"
                    value={signUpPassword}
                  />
                  <FieldDescription>
                    {anonymousMode
                      ? "This will attach your current guest activity to a permanent account."
                      : "Use a password with enough length to protect purchase access."}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <Button disabled={isPending} type="submit">
                {isPending ? "Creating…" : anonymousMode ? "Link account" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
