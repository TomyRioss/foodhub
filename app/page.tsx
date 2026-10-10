import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { requireSession } from "@/lib/require-session";

export default function Home() {
  return <Suspense fallback={<main className="app-loading" role="status">Cargando Foodhub...</main>}><ProtectedHome /></Suspense>;
}

async function ProtectedHome() {
  const session = await requireSession();
  return <Dashboard email={session.user?.email} view="home" />;
}
