import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientFile, clientRecord, clientRecordFile, workOrder, workOrderFile } from "@/db/schema";
import { utapi } from "@/lib/uploadthing-server";
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
  /** Service agreements: private ACL (overrides app default public-read). Expiry from UT dashboard. */
  clientRecordServiceAgreementUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10, acl: "private" },
    image: { maxFileSize: "8MB", maxFileCount: 10, acl: "private" },
  })
    .input(z.object({ clientRecordId: z.string().min(1) }))
    .middleware(async ({ req, input }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new UploadThingError("Unauthorized");
      const role = (session.user.role ?? "client") as string;
      if (role !== "owner") {
        throw new UploadThingError("Only owners can upload service agreements");
      }

      const [record] = await db
        .select({ id: clientRecord.id })
        .from(clientRecord)
        .where(eq(clientRecord.id, input.clientRecordId))
        .limit(1);
      if (!record) throw new UploadThingError("Client not found");

      return { userId: session.user.id, clientRecordId: record.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const fileKey = file.key;

      try {
        await utapi.updateACL(fileKey, "private");
      } catch {
        // Continue if ACL already private or update unavailable
      }

      await db.insert(clientRecordFile).values({
        id,
        clientRecordId: metadata.clientRecordId,
        fileKey,
        url: file.ufsUrl ?? file.url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedById: metadata.userId,
        createdAt: now,
      });
      return { clientRecordId: metadata.clientRecordId, fileId: id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
