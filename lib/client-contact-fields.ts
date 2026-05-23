export type ClientContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
};

export type ClientContactValues = {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
};

export function parseClientContactInput(
  body: ClientContactInput,
  requireName: boolean
): { ok: true; values: ClientContactValues } | { ok: false; error: string } {
  const name = body.name?.trim() ?? "";
  if (requireName && !name) {
    return { ok: false, error: "Contact name is required" };
  }

  return {
    ok: true,
    values: {
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      location: body.location?.trim() || null,
      street: body.street?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      zip: body.zip?.trim() || null,
      country: body.country?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  };
}

export function mergeClientContactPatch(
  existing: ClientContactValues & { quickbooksCustomerId?: string | null },
  body: ClientContactInput
): { ok: true; values: ClientContactValues } | { ok: false; error: string } {
  const name = body.name !== undefined ? body.name.trim() : existing.name;
  if (!name) {
    return { ok: false, error: "Contact name is required" };
  }

  return {
    ok: true,
    values: {
      name,
      email: body.email !== undefined ? body.email.trim() || null : existing.email,
      phone: body.phone !== undefined ? body.phone.trim() || null : existing.phone,
      location:
        body.location !== undefined ? body.location.trim() || null : existing.location,
      street: body.street !== undefined ? body.street.trim() || null : existing.street,
      city: body.city !== undefined ? body.city.trim() || null : existing.city,
      state: body.state !== undefined ? body.state.trim() || null : existing.state,
      zip: body.zip !== undefined ? body.zip.trim() || null : existing.zip,
      country: body.country !== undefined ? body.country.trim() || null : existing.country,
      notes: body.notes !== undefined ? body.notes.trim() || null : existing.notes,
    },
  };
}
