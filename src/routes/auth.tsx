import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/app/brand";

function safeNext(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.includes("\\") ||
    [...value].some((char) => char.charCodeAt(0) <= 32)
  )
    return;
  const url = new URL(value, "https://prepare.invalid");
  if (url.origin !== "https://prepare.invalid" || /^\/auth\/?$/.test(url.pathname)) return;
  return url.pathname + url.search + url.hash;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { next?: string; recovery?: boolean } => ({
    next: safeNext(search.next),
    recovery: search.recovery === true || search.recovery === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Prepare" },
      { name: "description", content: "Sign in to save your progress, resumes and study plan." },
    ],
  }),
  component: AuthScreen,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z
  .string()
  .min(6, "Use at least 6 characters")
  .max(72, "Use no more than 72 characters");
const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name").max(50),
    lastName: z.string().trim().min(1, "Enter your last name").max(50),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number")
      .refine((value) => value.replace(/\D/g, "").length >= 6, "Enter a valid phone number"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
const NATIVE_AUTH_CALLBACK = "com.prepareai.app://auth/callback";
const empty = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};
type FieldName = keyof typeof empty;
type Mode = "signin" | "signup" | "forgot" | "reset";

function AuthScreen() {
  const navigate = useNavigate();
  const { next, recovery } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(recovery ? "reset" : "signin");
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const pending = useRef(false);
  const recovering = useRef(Boolean(recovery));
  const afterAuth = useCallback(() => {
    if (next) window.location.replace(next);
    else void navigate({ to: "/dashboard", replace: true });
  }, [navigate, next]);

  useEffect(() => {
    let active = true;
    recovering.current =
      Boolean(recovery) ||
      new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    if (recovering.current) setMode("reset");
    const redirect = () => {
      if (next) window.location.replace(next);
      else void navigate({ to: "/dashboard", replace: true });
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        recovering.current = true;
        setMode("reset");
        setCanReset(Boolean(session));
        setError("");
      } else if (event === "SIGNED_IN" && session && !recovering.current && !pending.current)
        redirect();
    });
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) throw sessionError;
        if (recovering.current) {
          setCanReset(Boolean(data.session));
          if (!data.session)
            setError("This reset link has expired or is invalid. Request a new link below.");
        } else if (data.session) redirect();
      })
      .catch(() => {
        if (active) setError("We couldn't check your session. Please try signing in again.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate, next, recovery]);

  function switchMode(value: Mode) {
    setMode(value);
    setErrors({});
    setError("");
    setNotice("");
    setForm((current) => ({ ...empty, email: current.email }));
  }
  function set(key: FieldName, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError("");
    setNotice("");
  }
  function validate(schema: z.ZodType) {
    const result = schema.safeParse(form);
    if (result.success) return true;
    const messages: Partial<Record<FieldName, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as FieldName;
      if (!messages[field]) messages[field] = issue.message;
    }
    setErrors(messages);
    document.getElementById(String(result.error.issues[0].path[0]))?.focus();
    return false;
  }
  function callbackUrl(reset = false) {
    const url = new URL("/auth", window.location.origin);
    if (next) url.searchParams.set("next", next);
    if (reset) url.searchParams.set("recovery", "true");
    return url.href;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !ready) return;
    setError("");
    setNotice("");
    setErrors({});
    const schema =
      mode === "signup"
        ? signUpSchema
        : mode === "reset"
          ? resetSchema
          : mode === "forgot"
            ? z.object({ email: emailSchema })
            : signInSchema;
    if (!validate(schema)) return;
    pending.current = true;
    setBusy("email");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: callbackUrl(true),
        });
        if (error) throw error;
        setNotice(
          "If an account exists for this email, you'll receive a password reset link. Check your inbox and spam folder.",
        );
      } else if (mode === "reset") {
        if (!canReset) throw new Error("Request a new password reset link to continue.");
        const { error } = await supabase.auth.updateUser({ password: form.password });
        if (error) throw error;
        afterAuth();
      } else if (mode === "signup") {
        const { firstName, lastName, email, phone, password } = signUpSchema.parse(form);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl(),
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
              phone,
            },
          },
        });
        if (error) throw error;
        if (data.session) afterAuth();
        else {
          switchMode("signin");
          setNotice(
            "Check your email for a confirmation link before signing in. If you already have an account, sign in or reset your password.",
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword(signInSchema.parse(form));
        if (error) throw error;
        if (!data.session) throw new Error("Sign-in did not complete. Please try again.");
        afterAuth();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  async function google() {
    if (pending.current || !ready) return;
    pending.current = true;
    setBusy("google");
    setError("");
    setNotice("");
    try {
      const native = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: native ? NATIVE_AUTH_CALLBACK : callbackUrl(),
          skipBrowserRedirect: native,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      if (native) {
        if (!data.url) throw new Error("Google sign-in could not be started. Please try again.");
        if (next) sessionStorage.setItem("prepareai.auth.next", next);
        else sessionStorage.removeItem("prepareai.auth.next");
        await Browser.open({ url: data.url });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  const isSignUp = mode === "signup";
  const passwordOnly = mode === "reset";
  const emailOnly = mode === "forgot";
  const disabled = Boolean(busy) || !ready;
  const titles = {
    signin: "Welcome back",
    signup: "Create your account",
    forgot: "Forgot your password?",
    reset: "Set a new password",
  };
  const descriptions = {
    signin: "Sign in to continue your preparation.",
    signup: "Start your journey. Keep your progress in sync.",
    forgot: "Enter your email and we'll send you a reset link.",
    reset: "Choose a new password with at least 6 characters.",
  };
  function field(
    name: FieldName,
    label: string,
    icon: typeof Mail,
    type = "text",
    autoComplete?: string,
  ) {
    return (
      <Field
        key={`${mode}-${name}`}
        id={name}
        label={label}
        icon={icon}
        type={type}
        autoComplete={autoComplete}
        value={form[name]}
        error={errors[name]}
        disabled={disabled}
        onChange={(value) => set(name, value)}
        maxLength={
          name === "email" ? 255 : name === "phone" ? 20 : name.includes("Name") ? 50 : undefined
        }
      />
    );
  }
  return (
    <main className="hero-surface min-h-dvh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          aria-label="Prepare home"
          className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandMark size={40} />
          <span className="text-xl font-bold tracking-tight">Prepare</span>
        </Link>
        <header className="mb-6 mt-7">
          <h1 className="text-3xl font-bold tracking-tight">{titles[mode]}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{descriptions[mode]}</p>
        </header>
        <div className="surface-card p-5 sm:p-6">
          {!emailOnly && !passwordOnly && (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl bg-card font-semibold"
                disabled={disabled}
                onClick={google}
              >
                {busy === "google" ? (
                  <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {busy === "google" ? "Connecting…" : "Continue with Google"}
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed"
            >
              {notice}
            </p>
          )}
          <form onSubmit={submit} noValidate className="space-y-4" aria-busy={disabled}>
            {isSignUp && (
              <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 min-[360px]:gap-3">
                {field("firstName", "First name", User, "text", "given-name")}
                {field("lastName", "Last name", User, "text", "family-name")}
              </div>
            )}
            {!passwordOnly && field("email", "Email", Mail, "email", "email")}
            {isSignUp && field("phone", "Phone number", Phone, "tel", "tel")}
            {!emailOnly &&
              field(
                "password",
                passwordOnly ? "New password" : "Password",
                Lock,
                "password",
                isSignUp || passwordOnly ? "new-password" : "current-password",
              )}
            {(isSignUp || passwordOnly) && (
              <>
                <p className="text-xs text-muted-foreground">Use 6–72 characters.</p>
                {field("confirmPassword", "Confirm password", Lock, "password", "new-password")}
              </>
            )}
            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => switchMode("forgot")}
                  className="min-h-11 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <Button
              type="submit"
              disabled={disabled || (passwordOnly && !canReset)}
              className="primary-surface h-12 w-full rounded-xl font-semibold hover:opacity-95"
            >
              {disabled && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {!ready
                ? "Checking session…"
                : busy === "email"
                  ? "Please wait…"
                  : isSignUp
                    ? "Create account"
                    : emailOnly
                      ? "Send reset link"
                      : passwordOnly
                        ? "Save new password"
                        : "Sign in"}
            </Button>
          </form>
          {passwordOnly && !canReset && ready && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => switchMode("forgot")}
              className="mt-4 min-h-11 w-full text-sm font-medium text-primary hover:underline"
            >
              Request a new reset link
            </button>
          )}
        </div>
        <div className="mt-5 text-center">
          <button
            type="button"
            disabled={disabled}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            onClick={() => switchMode(isSignUp || emailOnly || passwordOnly ? "signin" : "signup")}
          >
            {(emailOnly || passwordOnly) && <ArrowLeft aria-hidden="true" className="size-4" />}
            {emailOnly || passwordOnly
              ? "Back to sign in"
              : isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  maxLength,
  autoComplete,
  error,
  disabled,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          name={id}
          required
          type={password && visible ? "text" : type}
          value={value}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={type === "email" ? false : undefined}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 rounded-xl bg-background pl-10 text-base md:text-base ${password ? "pr-12" : "pr-3"} ${error ? "border-destructive" : ""}`}
        />
        {password && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
            className="absolute right-0 top-0 flex size-12 items-center justify-center rounded-xl text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59C7.19 7.71 9.4 5.95 12 5.95Z"
      />
    </svg>
  );
}
