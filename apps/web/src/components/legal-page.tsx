import type { ReactNode } from "react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

interface LegalPageProps {
  children: ReactNode
  description: string
  title: string
}

export function LegalPage({ children, description, title }: LegalPageProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3 border-b border-border pb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </header>
        <article className="prose prose-sm prose-neutral max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-foreground prose-a:underline-offset-4">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
