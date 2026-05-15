import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { buckets } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { NewProjectClient } from "./NewProjectClient";

export default async function NewProjectPage() {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const isManager = role === "admin" || role === "manager";

  if (!isManager) redirect("/projects");

  const bucketRows = await db
    .select({ id: buckets.id, name: buckets.name })
    .from(buckets)
    .orderBy(asc(buckets.position));

  return <NewProjectClient initialBuckets={bucketRows} />;
}
