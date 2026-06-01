"use client";

import * as React from "react";
import { Button, Input, Mail, Lock, User } from "@/components/atoms";
import { toast } from "@/components/molecules/toast";
import Link from "next/link";
import { register } from "../actions";

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
