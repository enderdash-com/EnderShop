import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { SiteFooter } from "@/components/site-footer"

interface LegalPageProps {
  children: ReactNode
  description: string
  title: string
}

export function LegalPage({
  children,
  description,
  title,
}: LegalPageProps) {
  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <Card className="border border-border/80">
          <CardHeader className="border-b border-border/70">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 text-sm leading-7 text-muted-foreground">
            {children}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
