import { redirect } from "next/navigation";

/**
 * Root page — redirige al login (SRS v3.0 §6.2 Flujo de Onboarding).
 * El middleware maneja la redirección a /dashboard si ya hay sesión activa.
 */
export default function Home() {
  redirect("/login");
}
