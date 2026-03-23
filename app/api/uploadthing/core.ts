import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientFile } from "@/db/schema";

const f = createUploadthing();

export const ourFileRouter = {
  clientFileUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .input(z.object({ clientId: z.string().min(1) }))
    .middleware(async ({ req, input }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (!session) throw new UploadThingError("Unauthorized");
      const role = (session.user.role ?? "client") as string;
      if (role !== "owner") throw new UploadThingError("Only owners can upload client files");
      return { userId: session.user.id, clientId: input.clientId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const clientId = metadata.clientId;
      if (!clientId) return;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.insert(clientFile).values({
        id,
        clientId,
        fileKey: file.key,
        url: file.ufsUrl ?? file.url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedById: metadata.userId,
        createdAt: now,
      });
      return { clientId, fileId: id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
