import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientRecord, clientRecordFile } from "@/db/schema";
import { utapi } from "@/lib/uploadthing-server";

type RouteContext = { params: Promise<{ id: string }> };

/** GET — List service agreements (owner only). Download URLs are issued on click. */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const [client] = await db
    .select({ id: clientRecord.id })
    .from(clientRecord)
    .where(eq(clientRecord.id, id))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const files = await db
    .select()
    .from(clientRecordFile)
    .where(eq(clientRecordFile.clientRecordId, id))
    .orderBy(desc(clientRecordFile.createdAt));

  return NextResponse.json({ files });
}

/** DELETE — Remove a service agreement (owner only). */
export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(clientRecordFile)
    .where(eq(clientRecordFile.id, fileId))
    .limit(1);
  if (!row || row.clientRecordId !== id) {
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

  await db.delete(clientRecordFile).where(eq(clientRecordFile.id, fileId));
  return NextResponse.json({ success: true });
}
