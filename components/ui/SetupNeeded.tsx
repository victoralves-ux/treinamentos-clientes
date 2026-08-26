export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-2xl font-semibold">Configuração pendente</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--app-muted)" }}>
        A aplicação precisa de um projeto Supabase para funcionar (banco de dados e login).
      </p>
      <ol className="mt-6 grid gap-3 text-sm" style={{ color: "var(--app-muted)" }}>
        <li>1. Crie um projeto em supabase.com.</li>
        <li>
          2. No SQL Editor, execute o arquivo <code>supabase/schema.sql</code> deste repositório.
        </li>
        <li>
          3. Defina as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </li>
        <li>4. Reinicie a aplicação.</li>
      </ol>
    </div>
  );
}
