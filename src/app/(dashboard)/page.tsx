"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [firstZoneId, setFirstZoneId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => {
        if (!r.ok) throw new Error("Not logged in");
        return r.json();
      })
      .then((data) => {
        const realZones = (data || []).filter((z: any) => !z.is_virtual && !z.isVirtual);
        if (realZones.length > 0) {
          setFirstZoneId(realZones[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (firstZoneId) {
      router.replace(`/zone/${firstZoneId}`);
    }
  }, [firstZoneId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}
