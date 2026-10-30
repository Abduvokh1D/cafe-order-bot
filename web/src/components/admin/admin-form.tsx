"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * Admin formalari uchun umumiy o'ram: xato va "Saqlandi" xabarini ko'rsatadi.
 * React o'zi formani har safar tozalaydi, shuning uchun yuborish qo'lda qilinadi:
 * xato bo'lganda yozilgan matn yo'qolmaydi.
 */
export function AdminForm({
  action,
  children,
  className,
  confirmMessage,
  resetOnSuccess = false,
  showSaved = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  resetOnSuccess?: boolean;
  showSaved?: boolean;
}) {
  const [state, dispatch, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Yuborilayotganda maydonlar o'chiq: qayta yuborilsa, FormData bo'sh ketadi
    if (isPending) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form ref={formRef} action={dispatch} onSubmit={handleSubmit} className={className}>
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      {showSaved && state.ok && !isPending && (
        <p role="status" className="basis-full text-sm text-hint">
          Saqlandi.
        </p>
      )}
    </form>
  );
}
