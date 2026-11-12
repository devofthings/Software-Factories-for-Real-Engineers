import type { Route } from "./+types/api.knock-vendor.prototype"
import { session, trigger } from "~/lib/knock-vendor.prototype.server"

export async function loader({ request }: Route.LoaderArgs) {
  return Response.json(await session(request), { headers: { "Cache-Control": "no-store" } })
}

export async function action({ request }: Route.ActionArgs) {
  return Response.json(await trigger(request), { headers: { "Cache-Control": "no-store" } })
}
