import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { clientSession, prototypeSession, sampleNotifications, knock, workflowKey } from "~/lib/notification-feed.prototype.server"

export async function loader({ request }: LoaderFunctionArgs) {
  try { return Response.json(await clientSession(request), { headers: { "Cache-Control": "no-store" } }) }
  catch (error) {
    if (error instanceof Response) return error
    return Response.json({ error: (error as Error).message }, { status: 503 })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, recipient } = await prototypeSession(request)
  if (request.headers.get("Origin") !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 })
  try {
    const samples = sampleNotifications(user)
    for (const sample of samples) await knock(`/workflows/${workflowKey}/trigger`, {
      recipients: [{ id: recipient, name: user.name }],
      data: { ...sample, prototype: true },
    })
    return Response.json({ sent: samples.length })
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: 502 }) }
}
