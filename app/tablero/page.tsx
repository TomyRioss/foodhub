import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { requireSession } from "@/lib/require-session";

export default function BoardPage() {
  return <Suspense fallback={<main className="app-loading" role="status">Cargando Foodhub...</main>}><ProtectedBoard /></Suspense>;
}

async function ProtectedBoard() {
  const session = await requireSession();
  return <Dashboard email={session.user?.email} view="board" />;
}
