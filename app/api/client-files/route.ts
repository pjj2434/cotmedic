import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientFile } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { utapi } from "@/lib/uploadthing-server";

/** GET - List files. Owner can list any client's files; client can list only their own. */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "client"] });
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser, role } = authResult;

  const { searchParams } = new URL(request.url);
  const clientIdParam = searchParams.get("clientId");
  const clientId = role === "client" ? authUser.id : (clientIdParam ?? null);

  if (!clientId) {
    return NextResponse.json(
      { error: role === "owner" ? "clientId required" : "Unauthorized" },
      { status: 400 }
    );
  }

  if (role === "client" && clientId !== authUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await db
    .select()
    .from(clientFile)
    .where(eq(clientFile.clientId, clientId))
    .orderBy(desc(clientFile.createdAt));

  return NextResponse.json({ files });
}

/** DELETE - Remove a file from DB and UploadThing storage. Owner only. */
export async function DELETE(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [row] = await db.select().from(clientFile).where(eq(clientFile.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.fileKey?.trim()) {
    try {
      await utapi.deleteFiles(row.fileKey);
    } catch {
      return NextResponse.json(
        { error: "Failed to delete file from storage. Try again." },
        { status: 502 }
      );
    }
  }

  await db.delete(clientFile).where(eq(clientFile.id, id));
  return NextResponse.json({ success: true });
}
