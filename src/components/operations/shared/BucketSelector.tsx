import Link from "next/link";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

interface BucketOption {
  id: string;
  name: string;
  color: string | null;
}

export function BucketSelector({ buckets }: { buckets: BucketOption[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {buckets.map((b) => (
        <Link key={b.id} href={`/operations/${b.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: b.color ?? "#6B5FE4" }}
              >
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-text">{b.name}</p>
                <p className="text-xs text-text-muted">Ver catálogo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
