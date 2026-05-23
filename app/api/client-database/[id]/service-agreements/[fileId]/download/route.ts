import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientRecord, clientRecordFile } from "@/db/schema";
import { getClientRecordFileSignedUrl } from "@/lib/client-record-files";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

/** GET — Fresh presigned download URL (owner only, short-lived). */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id, fileId } = await context.params;

  const [client] = await db
    .select({ id: clientRecord.id })
    .from(clientRecord)
    .where(eq(clientRecord.id, id))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [file] = await db
    .select({ id: clientRecordFile.id, fileKey: clientRecordFile.fileKey })
    .from(clientRecordFile)
    .where(
      and(eq(clientRecordFile.id, fileId), eq(clientRecordFile.clientRecordId, id))
    )
    .limit(1);
  if (!file?.fileKey?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const signedUrl = await getClientRecordFileSignedUrl(file.fileKey);
    return NextResponse.json({ signedUrl });
  } catch {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 502 });
  }
}
