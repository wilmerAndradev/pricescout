"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function LoadingJobPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex justify-center py-20">
      <span className="text-[var(--color-slate-500)] font-semibold">Redireccionando...</span>
    </div>
  );
}
