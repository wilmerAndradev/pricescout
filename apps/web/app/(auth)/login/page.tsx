"use client";

import * as React from "react";
import { Button, Input, Mail, Lock } from "@/components/atoms";
import { toast } from "@/components/molecules/toast";
import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  const [isPending, setIsPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await login(formData);
    
    if (result?.error) {
      toast.error("Error al iniciar sesión", {
        description: result.error === "Invalid login credentials" 
          ? "Credenciales inválidas (AUTH-001)" 
          : result.error
      });
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="••••••••"
          required
          iconLeft={<Lock size={20} />}
          disabled={isPending}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link href="#" className="font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-500)]">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-slate-200)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-[var(--color-slate-500)] font-body">
              ¿No tienes una cuenta?
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/register" className="w-full block">
            <Button variant="secondary" className="w-full">
              Crear una cuenta nueva
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
