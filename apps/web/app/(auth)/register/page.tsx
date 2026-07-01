"use client";

import * as React from "react";
import { Button, Input, Mail, Lock, User } from "@/components/atoms";
import { toast } from "@/components/molecules/toast";
import Link from "next/link";
import { register } from "../actions";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [isPending, setIsPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await register(formData);
    
    if (result?.error) {
      toast.error("Error al registrarse", {
        description: result.error
      });
      setIsPending(false);
    }
  }

  async function handleGoogleLogin() {
    setIsPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast.error("Error con Google OAuth", {
        description: error.message || "No se pudo registrar con Google"
      });
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold text-[var(--color-slate-900)]">
          Crea tu cuenta
        </h2>
        <p className="text-sm font-body text-[var(--color-slate-500)] mt-1">
          Comienza a comparar precios hoy mismo
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="fullName"
          name="fullName"
          type="text"
          label="Nombre completo"
          placeholder="Juan Pérez"
          required
          iconLeft={<User size={20} />}
          disabled={isPending}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          required
          iconLeft={<Mail size={20} />}
          disabled={isPending}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          iconLeft={<Lock size={20} />}
          disabled={isPending}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={isPending}
        >
          {isPending ? "Registrando..." : "Crear cuenta"}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-slate-200)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-[var(--color-slate-500)] font-body">
              O continúa con
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-2 h-11"
          onClick={handleGoogleLogin}
          disabled={isPending}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
      </div>

      <div className="mt-6 border-t border-[var(--color-slate-100)] pt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-slate-200)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-[var(--color-slate-500)] font-body">
              ¿Ya tienes cuenta?
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/login" className="w-full block">
            <Button variant="secondary" className="w-full">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
