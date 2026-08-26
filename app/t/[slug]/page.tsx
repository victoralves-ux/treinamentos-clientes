import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TreinamentoRenderer } from "@/components/treinamento/TreinamentoRenderer";
import { getPublishedTreinamento } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const treinamento = await getPublishedTreinamento(slug);
  if (!treinamento?.spec) return { title: "Treinamento não encontrado" };
  return { title: treinamento.spec.meta.titulo };
}

export default async function PublishedTreinamento({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const treinamento = await getPublishedTreinamento(slug);
  if (!treinamento?.spec) notFound();
  return <TreinamentoRenderer spec={treinamento.spec} slug={slug} />;
}
