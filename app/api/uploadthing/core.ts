import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientFile, workOrder, workOrderFile } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  workOrderFileUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .input(z.object({ workOrderId: z.string().min(1) }))
    .middleware(async ({ req, input }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (!session) throw new UploadThingError("Unauthorized");
      const role = (session.user.role ?? "client") as string;
      if (role !== "owner" && role !== "technician") {
        throw new UploadThingError("Only owners and technicians can upload work order files");
      }

      const rows = await db
        .select({ id: workOrder.id, customerId: workOrder.customerId, technicianId: workOrder.technicianId })
        .from(workOrder)
        .where(eq(workOrder.id, input.workOrderId))
        .limit(1);
      const order = rows[0];
      if (!order) throw new UploadThingError("Work order not found");
      if (role === "technician" && order.technicianId !== session.user.id) {
        throw new UploadThingError("Forbidden");
      }

      return { userId: session.user.id, workOrderId: order.id, customerId: order.customerId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.insert(workOrderFile).values({
        id,
        workOrderId: metadata.workOrderId,
        customerId: metadata.customerId,
        fileKey: file.key,
        url: file.ufsUrl ?? file.url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedById: metadata.userId,
        createdAt: now,
      });
      return { workOrderId: metadata.workOrderId, fileId: id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
