import { auth } from "../../lib/auth.js";
import { readOrCreateProfile } from "../../lib/player-profile.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) return res.status(401).json({ error: "authentication_required" });

    const row=await readOrCreateProfile(session.user.id);

    return res.status(200).json({
      user: { id: session.user.id, name: session.user.name, image: session.user.image },
      profile: row.state,
      revision: Number(row.revision),
    });
  } catch (error) {
    console.error("Player profile read failed", error);
    return res.status(503).json({ error: "profile_unavailable" });
  }
}
