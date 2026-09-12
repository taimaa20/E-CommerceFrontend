import { redirect } from "next/navigation";

/**
 * The application root is the retail storefront.
 *
 * A temporary (307) redirect rather than a permanent one, and rather than re-exporting a
 * page component, so the browser never caches the mapping and the legacy marketing site at
 * /website stays reachable and reversible until the dead-code phase removes it.
 */
export default function RootPage() {
  redirect("/shop");
}
