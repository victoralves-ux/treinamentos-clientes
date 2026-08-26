"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const STATUS = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "gerando", label: "Gerando" },
  { value: "pronto", label: "Pronto" },
  { value: "erro", label: "Erro" },
];

export function Filters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "todos") params.set(k, v);
      else params.delete(k);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
        className="flex-1 min-w-[220px]"
      >
        <input
          className="field"
          placeholder="Buscar cliente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <select
        className="field w-auto"
        defaultValue={sp.get("status") ?? "todos"}
        onChange={(e) => apply({ status: e.target.value })}
      >
        {STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
