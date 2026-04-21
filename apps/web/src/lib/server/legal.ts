import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"

export const getLegalCompanyInfo = createServerFn().handler(() => ({
  city: env.SHOP_COMPANY_CITY,
  country: env.SHOP_COMPANY_COUNTRY,
  email: env.SHOP_COMPANY_EMAIL,
  name: env.SHOP_COMPANY_NAME,
  street: env.SHOP_COMPANY_STREET,
  vatId: env.SHOP_COMPANY_VAT_ID,
}))
