import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  filtersFromParams,
  listContacts,
  countContacts,
  outreachFacets,
  toOutreachFilters,
} from "@/lib/outreach";
import { OutreachContactsManager } from "@/components/admin/OutreachContactsManager";
import { OutreachImportForm } from "@/components/admin/OutreachImportForm";
import { OutreachBatchesManager } from "@/components/admin/OutreachBatchesManager";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const params = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => e[1] !== undefined),
  );
  const dto = filtersFromParams(params);
  const filters = toOutreachFilters(dto);

  const [contacts, total, batches, facets] = await Promise.all([
    listContacts(prisma, filters, { take: PAGE_SIZE }),
    countContacts(prisma, filters),
    prisma.outreachBatch.findMany({
      include: { _count: { select: { contacts: true } } },
      orderBy: { importedAt: "desc" },
    }),
    outreachFacets(prisma),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recruitment outreach</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Companies hiring talent. Separate from course leads: nothing here
            touches the training pipeline.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/outreach/email">Write an email</Link>
        </Button>
      </div>

      <OutreachContactsManager
        contacts={contacts.map((c) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          companyName: c.companyName,
          jobTitle: c.jobTitle,
          industry: c.industry,
          companySize: c.companySize,
          location: c.location,
          hiringRoles: c.hiringRoles,
          hiringSource: c.hiringSource,
          triggerEvent: c.triggerEvent,
          personalization: c.personalization,
          batchId: c.batchId,
          batchName: c.batch?.name ?? null,
          importedAt: c.importedAt.toISOString(),
          unsubscribed: c.unsubscribed,
          lastEmailedAt: c.lastEmailedAt?.toISOString() ?? null,
        }))}
        total={total}
        batches={batches.map((b) => ({ id: b.id, name: b.name }))}
        facets={facets}
        filters={{ ...dto, require: dto.require }}
      />

      <OutreachImportForm batches={batches.map((b) => b.name)} />

      <OutreachBatchesManager
        batches={batches.map((b) => ({
          id: b.id,
          name: b.name,
          note: b.note,
          importedAt: b.importedAt.toISOString(),
          contactCount: b._count.contacts,
        }))}
      />
    </div>
  );
}
