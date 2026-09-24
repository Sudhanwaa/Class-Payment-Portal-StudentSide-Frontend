"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { tenantConfig } from "@/config/tenant";
import { isDemoMode, studentApi } from "@/lib/student-api";
import { openRazorpayCheckout } from "@/lib/payment-gateway";
import type {
  FeeLedger,
  PaymentOrder,
  PaymentOutcome,
  RequestState,
  Student,
} from "@/lib/types";

type View = "checking" | "login" | "search" | "fees" | "confirmation" | "processing" | "outcome";

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
};

const portalSteps = ["Access", "Find yourself", "Your fees", "Payment"] as const;

function PortalProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-7 sm:px-8 sm:pt-10">
      <div
        className="flex items-center"
        role="progressbar"
        aria-label={`Step ${currentStep} of ${portalSteps.length}: ${portalSteps[currentStep - 1]}`}
        aria-valuemin={1}
        aria-valuemax={portalSteps.length}
        aria-valuenow={currentStep}
      >
        {portalSteps.map((label, index) => {
          const step = index + 1;
          const complete = step < currentStep;
          const current = step === currentStep;

          return (
            <div
              key={label}
              className={`flex items-center ${index < portalSteps.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex shrink-0 flex-col items-center">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-extrabold transition-all duration-300 sm:h-11 sm:w-11 ${
                    complete || current
                      ? "bg-brand-600 text-buttonText shadow-[0_7px_20px_rgb(var(--color-primary)/0.18)]"
                      : "border-2 border-tenantBorder bg-surface text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {complete ? <Icon name="check" className="h-5 w-5" /> : step}
                </span>
                <span
                  className={`mt-2 hidden whitespace-nowrap text-[10px] font-bold sm:block ${
                    complete || current ? "text-brand-700" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < portalSteps.length - 1 && (
                <span className="mx-2 mb-0.5 h-px flex-1 overflow-hidden bg-tenantBorder sm:mx-4 sm:mb-5">
                  <span
                    className={`block h-full bg-brand-600 transition-all duration-500 ${
                      complete ? "w-full" : "w-0"
                    }`}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted sm:hidden">
        Step {currentStep} of {portalSteps.length} · {portalSteps.length - currentStep}{" "}
        {portalSteps.length - currentStep === 1 ? "step" : "steps"} remaining
      </p>
    </div>
  );
}

function PortalHeader({
  step,
  onBack,
  backLabel,
}: {
  step: number;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <>
      <header className="bg-brand-900 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 bg-cover bg-center text-brand-900 shadow-sm sm:h-12 sm:w-12"
              style={
                tenantConfig.logoUrl
                  ? { backgroundImage: `url("${tenantConfig.logoUrl}")` }
                  : undefined
              }
              role={tenantConfig.logoUrl ? "img" : undefined}
              aria-label={tenantConfig.logoUrl ? `${tenantConfig.name} logo` : undefined}
            >
              {!tenantConfig.logoUrl && <Icon name="music" className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-[-0.025em] text-white sm:text-lg">
                {tenantConfig.name}
              </p>
              <p className="text-xs font-semibold text-white/65">Student fee portal</p>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 text-xs font-bold text-white/70 sm:flex">
            <Icon name="shield" className="h-4 w-4 text-brand-50" />
            Secure portal
          </div>
        </div>
      </header>
      <PortalProgress currentStep={step} />
      {onBack && (
        <div className="mx-auto w-full max-w-3xl px-5 pt-7 sm:px-8 sm:pt-8">
          <button
            type="button"
            onClick={onBack}
            className="group -ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted transition hover:bg-brand-50 hover:text-brand-700"
          >
            <Icon
              name="arrow"
              className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            {backLabel ?? "Back to previous step"}
          </button>
        </div>
      )}
    </>
  );
}

function DemoNotice() {
  if (!isDemoMode) return null;
  return (
    <div className="mx-auto mb-5 mt-6 w-full max-w-xl px-5 sm:px-0">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <span className="font-extrabold">Demo mode</span> · Use password{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5 font-bold">sonic2026</code>. Payment
        outcomes are simulated and never mark real fees as paid.
      </div>
    </div>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<RequestState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      await studentApi.authenticate(password);
      setStatus("success");
      window.setTimeout(onAuthenticated, 350);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setStatus("error");
      if (message === "INCORRECT_PASSWORD") {
        setError("That password isn’t correct. Check it and try again.");
      } else if (message === "AUTH_ENDPOINT_NOT_CONFIGURED") {
        setError("Portal authentication has not been connected yet.");
      } else {
        setError("We couldn’t connect to the portal. Check your connection and try again.");
      }
    }
  }

  return (
    <>
      <PortalHeader step={1} />
      <DemoNotice />
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 pb-12 sm:px-0 sm:pb-20">
        <section className="animate-enter w-full overflow-hidden rounded-2xl border border-tenantBorder bg-surface shadow-card">
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="lock" className="h-6 w-6" />
              </div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
                Student portal
              </p>
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
                Welcome to {tenantConfig.shortName}
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-6 text-muted">
                Pay your fees securely and easily. Enter the portal password provided by your
                school to continue.
              </p>
            </div>

            <form onSubmit={submit} noValidate>
              <label htmlFor="portal-password" className="mb-2 block text-sm font-bold text-slate-800">
                Portal password
              </label>
              <div className="relative">
                <input
                  id="portal-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  disabled={status === "loading" || status === "success"}
                  autoComplete="current-password"
                  placeholder="Enter your portal password"
                  aria-describedby={error ? "password-error" : "password-help"}
                  aria-invalid={Boolean(error)}
                  className={`h-14 w-full rounded-xl border bg-surface px-4 pr-12 text-base font-medium text-ink transition placeholder:text-muted/70 disabled:bg-slate-50 ${
                    error
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-300 focus:border-brand-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} className="h-5 w-5" />
                </button>
              </div>
              {error ? (
                <p id="password-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : (
                <p id="password-help" className="mt-2 text-xs leading-5 text-slate-500">
                  This is the shared student portal password, not a personal account password.
                </p>
              )}

              <button
                type="submit"
                disabled={!password.trim() || status === "loading" || status === "success"}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-extrabold text-buttonText shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lift disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {status === "loading" && <Spinner />}
                {status === "success" && <Icon name="check" className="h-5 w-5" />}
                {status === "loading"
                  ? "Checking password…"
                  : status === "success"
                    ? "Access granted"
                    : "Continue"}
              </button>
            </form>
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-xs font-semibold text-slate-500">
            <Icon name="shield" className="h-4 w-4 text-brand-600" />
            Your connection and payment details are protected
          </div>
        </section>
      </main>
    </>
  );
}

function StudentResultCard({
  student,
  selecting,
  onSelect,
}: {
  student: Student;
  selecting: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={selecting}
      className="group flex w-full items-center gap-4 rounded-2xl border border-tenantBorder bg-surface p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-card disabled:translate-y-0 disabled:cursor-wait sm:p-5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 font-extrabold text-brand-700">
        {student.name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold text-ink">{student.name}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-500">
          Mobile ending in {student.mobileLastFour}
          {student.courseHint ? ` · ${student.courseHint}` : ""}
        </span>
      </span>
      {selecting ? (
        <Spinner className="h-5 w-5 text-brand-600" />
      ) : (
        <Icon
          name="chevron"
          className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
        />
      )}
    </button>
  );
}

function SearchScreen({
  onSelected,
  onBack,
}: {
  onSelected: (student: Student) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const data = await studentApi.searchStudents(trimmed, controller.signal);
        setResults(data);
        setStatus("success");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, retryKey]);

  async function select(student: Student) {
    if (selectedId) return;
    setSelectedId(student.id);
    try {
      await studentApi.selectStudent(student.id);
      onSelected(student);
    } catch {
      setSelectedId(null);
      setStatus("error");
    }
  }

  return (
    <>
      <PortalHeader step={2} onBack={onBack} backLabel="Back to portal access" />
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-5 sm:px-8 sm:pt-10">
        <section className="animate-enter">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
            Find your student record
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
            Who are you?
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            Search your name to view your outstanding fees.
          </p>

          <div className="relative mt-7">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={Boolean(selectedId)}
              aria-label="Search your name"
              aria-describedby="search-status"
              placeholder="Search your name…"
              className="h-16 w-full rounded-2xl border border-tenantBorder bg-surface pl-12 pr-12 text-base font-semibold text-ink shadow-sm transition placeholder:font-medium placeholder:text-muted/70 focus:border-brand-500 focus:shadow-card"
            />
            {query && !selectedId && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-50"
                aria-label="Clear search"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>

          <div id="search-status" aria-live="polite" className="mt-5 min-h-[216px]">
            {!query.trim() && (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Icon name="user" className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">Find your name to continue</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Only limited details are shown to protect student privacy.
                </p>
              </div>
            )}

            {status === "loading" && (
              <div className="space-y-3" aria-label="Searching students">
                {[0, 1].map((item) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-tenantBorder bg-surface p-4">
                    <div className="skeleton h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-2/5 rounded" />
                      <div className="skeleton h-3 w-3/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === "success" && results.length > 0 && (
              <div className="space-y-3">
                <p className="pb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  {results.length} {results.length === 1 ? "match" : "matches"} found
                </p>
                {results.map((student) => (
                  <StudentResultCard
                    key={student.id}
                    student={student}
                    selecting={selectedId === student.id}
                    onSelect={() => select(student)}
                  />
                ))}
              </div>
            )}

            {status === "success" && results.length === 0 && (
              <div className="rounded-2xl border border-tenantBorder bg-surface px-6 py-10 text-center shadow-sm">
                <p className="text-base font-extrabold text-ink">
                  We couldn’t find anyone matching “{query.trim()}”.
                </p>
                <p className="mt-2 text-sm text-slate-500">Check the spelling and try again.</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="mt-5 text-sm font-extrabold text-brand-700 hover:text-brand-900"
                >
                  Modify search
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
                <p className="font-extrabold text-red-900">Something went wrong</p>
                <p className="mt-1 text-sm text-red-700">We couldn’t search right now. Please try again.</p>
                <button
                  type="button"
                  onClick={() => setRetryKey((key) => key + 1)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-extrabold text-red-800 shadow-sm"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  Retry
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function FeeCard({ fee }: { fee: FeeLedger }) {
  const partial = fee.amountPaid > 0;
  return (
    <article className="rounded-2xl border border-tenantBorder bg-surface p-5 shadow-sm transition-shadow duration-200 hover:shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-ink">{monthLabel(fee.billingMonth)}</h3>
          <p className="mt-0.5 text-sm font-medium text-slate-500">{fee.course}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
            partial ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"
          }`}
        >
          {partial ? "Partially paid" : "Outstanding"}
        </span>
      </div>
      {partial ? (
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total fee</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{money(fee.totalDue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">{money(fee.amountPaid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Remaining</p>
            <p className="mt-1 text-base font-extrabold text-ink">{money(fee.outstandingAmount)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">Amount due</p>
          <p className="text-xl font-extrabold tracking-tight text-ink">{money(fee.outstandingAmount)}</p>
        </div>
      )}
    </article>
  );
}

function EmptyFeesState({ student }: { student: Student | null }) {
  return (
    <div className="animate-enter mx-auto max-w-lg rounded-2xl border border-tenantBorder bg-surface px-6 py-12 text-center shadow-card sm:px-10">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon name="check" className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">You’re all caught up!</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {student ? `${student.name} has` : "You have"} no outstanding fees at the moment.
      </p>
    </div>
  );
}

function FeesScreen({
  student,
  fees,
  totalOutstanding,
  onBack,
  onReview,
  onRetry,
  loading,
  error,
}: {
  student: Student | null;
  fees: FeeLedger[];
  totalOutstanding: number;
  onBack: () => void;
  onReview: () => void;
  onRetry: () => void;
  loading: boolean;
  error: boolean;
}) {
  return (
    <>
      <PortalHeader step={3} onBack={onBack} backLabel="Back to student search" />
      <main className={`mx-auto w-full max-w-3xl px-5 pt-4 sm:px-8 sm:pt-8 ${fees.length ? "pb-36" : "pb-16"}`}>
        {loading ? (
          <div className="space-y-4" aria-label="Loading outstanding fees">
            <div className="skeleton h-36 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-surface px-6 py-10 text-center shadow-card">
            <p className="text-lg font-extrabold text-ink">We couldn’t load your fees</p>
            <p className="mt-2 text-sm text-slate-500">Your fee status has not changed. Please try again.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-buttonText"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : fees.length === 0 ? (
          <EmptyFeesState student={student} />
        ) : (
          <section className="animate-enter">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Review your balance
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
              Outstanding fees
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-muted">
              This is the full amount currently due to {tenantConfig.name}.
            </p>

            <div className="mt-7 rounded-2xl bg-brand-900 p-6 text-white shadow-lift sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-brand-100">Total outstanding</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                    {money(totalOutstanding)}
                  </p>
                  <p className="mt-3 text-xs font-medium text-brand-100/80">
                    Across {fees.length} outstanding {fees.length === 1 ? "fee" : "fees"}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  {student?.name ?? "Your fees"}
                </span>
              </div>
            </div>

            <div className="mb-4 mt-8">
              <p className="text-sm font-extrabold text-ink">What’s included</p>
              <p className="mt-1 text-xs text-slate-500">
                All outstanding months are paid together. You’ll review the total before checkout.
              </p>
            </div>

            <div className="space-y-3">
              {fees.map((fee) => (
                <FeeCard key={fee.feeLedgerId} fee={fee} />
              ))}
            </div>
          </section>
        )}
      </main>

      {!loading && !error && fees.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-tenantBorder bg-surface/95 px-4 py-3 shadow-[0_-8px_30px_rgba(24,33,32,0.08)] backdrop-blur sm:py-4">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">
                {fees.length} outstanding {fees.length === 1 ? "fee" : "fees"}
              </p>
              <p className="mt-0.5 text-xl font-extrabold tracking-tight text-ink">{money(totalOutstanding)}</p>
            </div>
            <button
              type="button"
              onClick={onReview}
              className="min-w-[148px] rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-extrabold text-buttonText shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lift"
            >
              Pay {money(totalOutstanding)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PaymentConfirmation({
  fees,
  onBack,
  onProceed,
  submitting,
  error,
}: {
  fees: FeeLedger[];
  onBack: () => void;
  onProceed: () => void;
  submitting: boolean;
  error: string;
}) {
  const total = fees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
  return (
    <>
      <PortalHeader step={4} onBack={onBack} backLabel="Back to outstanding fees" />
      <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-4 sm:px-0 sm:pt-8">
        <section className="animate-enter overflow-hidden rounded-2xl border border-tenantBorder bg-surface shadow-card">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Review before paying
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">
              Payment summary
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-muted">
              You’re paying the full outstanding balance. Review each month before opening secure checkout.
            </p>

            <div className="mt-7 divide-y divide-tenantBorder rounded-xl border border-tenantBorder">
              {fees.map((fee) => (
                <div key={fee.feeLedgerId} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-extrabold text-ink">{fee.course}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{monthLabel(fee.billingMonth)}</p>
                  </div>
                  <p className="text-sm font-extrabold text-ink">{money(fee.outstandingAmount)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-end justify-between border-t-2 border-slate-100 pt-5">
              <div>
                <p className="text-sm font-extrabold text-ink">Total payable</p>
                <p className="mt-1 text-xs text-slate-500">Amount confirmed by the school</p>
              </div>
              <p className="text-3xl font-extrabold tracking-[-0.04em] text-ink">{money(total)}</p>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={onProceed}
              className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-extrabold text-buttonText transition duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lift disabled:translate-y-0 disabled:cursor-wait disabled:bg-brand-500"
            >
              {submitting ? <Spinner /> : <Icon name="shield" className="h-5 w-5" />}
              {submitting ? "Preparing secure checkout…" : "Proceed to payment"}
            </button>
            <p className="mt-3 text-center text-[11px] font-medium leading-5 text-slate-500">
              The payable amount is created securely by the school’s server. You cannot be charged
              more from this screen.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

function ProcessingScreen() {
  return (
    <>
      <PortalHeader step={4} />
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 pb-24">
        <div className="w-full text-center" role="status" aria-live="polite">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Spinner className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">Preparing your payment</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Please keep this page open. Don’t refresh or press the payment button again.
          </p>
        </div>
      </main>
    </>
  );
}

function DemoGateway({
  order,
  onOutcome,
}: {
  order: PaymentOrder;
  onOutcome: (outcome: PaymentOutcome) => void;
}) {
  const amount = order.razorpay.amount / 100;
  return (
    <>
      <PortalHeader step={4} />
      <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-8">
        <section className="animate-enter rounded-2xl border border-amber-200 bg-surface p-6 shadow-card sm:p-8">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
            Demo checkout
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Choose a test outcome</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This replaces Razorpay only in demo mode. No money moves and no real ledger is updated.
          </p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Test amount</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{money(amount)}</p>
          </div>
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() =>
                onOutcome({
                  kind: "success",
                  receipt: {
                    paymentId: order.paymentId,
                    amount,
                    transactionId: `pay_demo_${Date.now()}`,
                    paidAt: new Date().toISOString(),
                  },
                })
              }
              className="h-12 rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-buttonText"
            >
              Simulate backend-verified success
            </button>
            <button
              type="button"
              onClick={() => onOutcome({ kind: "failed", message: "The bank declined this test payment." })}
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700"
            >
              Simulate payment failure
            </button>
            <button
              type="button"
              onClick={() => onOutcome({ kind: "cancelled" })}
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700"
            >
              Simulate cancellation
            </button>
            <button
              type="button"
              onClick={() => onOutcome({ kind: "verifying", paymentId: order.paymentId })}
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700"
            >
              Simulate verification pending
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function OutcomeScreen({
  outcome,
  fees,
  checking,
  onBack,
  onRetry,
  onCheckStatus,
}: {
  outcome: PaymentOutcome;
  fees: FeeLedger[];
  checking: boolean;
  onBack: () => void;
  onRetry: () => void;
  onCheckStatus: () => void;
}) {
  const total = fees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
  const success = outcome.kind === "success";
  const verifying = outcome.kind === "verifying";
  const cancelled = outcome.kind === "cancelled";
  const network = outcome.kind === "network";

  const title = success
    ? "Payment successful"
    : verifying
      ? "Payment verification in progress"
      : cancelled
        ? "Payment cancelled"
        : network
          ? "We lost the connection"
          : "Payment could not be completed";

  const description = success
    ? `${money(outcome.receipt.amount)} was paid successfully.`
    : verifying
      ? "Your payment may have completed. We’re waiting for confirmation from the payment provider."
      : cancelled
        ? "You closed the checkout before completing payment. No fee has been marked as paid."
        : network
          ? outcome.message
          : `${outcome.message} No fee has been marked as paid.`;

  return (
    <>
      <PortalHeader step={4} onBack={onBack} backLabel="Back to outstanding fees" />
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 pb-20 pt-6 sm:px-0">
        <section className="animate-enter w-full rounded-2xl border border-tenantBorder bg-surface p-6 text-center shadow-card sm:p-10">
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
              success
                ? "bg-emerald-50 text-emerald-700"
                : verifying
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {success ? (
              <Icon name="check" className="h-8 w-8" />
            ) : verifying ? (
              <Spinner className="h-8 w-8" />
            ) : (
              <Icon name="close" className="h-8 w-8" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>

          <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 text-left">
            {fees.map((fee) => (
              <div key={fee.feeLedgerId} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-extrabold text-ink">{fee.course}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{monthLabel(fee.billingMonth)}</p>
                </div>
                <p className="text-sm font-extrabold text-ink">{money(fee.outstandingAmount)}</p>
              </div>
            ))}
          </div>

          {success && outcome.receipt.transactionId && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction reference</p>
              <p className="mt-1 break-all text-xs font-bold text-slate-700">{outcome.receipt.transactionId}</p>
            </div>
          )}

          {verifying && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-left text-xs font-semibold leading-5 text-amber-900">
              Don’t pay again while verification is pending. Checking status is safe and will not
              create another payment.
            </p>
          )}

          <div className="mt-7 grid gap-2">
            {verifying ? (
              <button
                type="button"
                disabled={checking}
                onClick={onCheckStatus}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-buttonText disabled:bg-brand-500"
              >
                {checking && <Spinner className="h-4 w-4" />}
                {checking ? "Checking status…" : "Check payment status"}
              </button>
            ) : !success ? (
              <button
                type="button"
                onClick={onRetry}
                className="h-12 rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-buttonText"
              >
                Try again · {money(total)}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onBack}
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              {success ? "View fee status" : "Back to fees"}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

export default function StudentPortal() {
  const [view, setView] = useState<View>("checking");
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<FeeLedger[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [feeState, setFeeState] = useState<RequestState>("idle");
  const [paymentError, setPaymentError] = useState("");
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const loadFees = useCallback(async () => {
    setFeeState("loading");
    try {
      const data = await studentApi.getFees();
      setFees(data.fees.filter((fee) => fee.outstandingAmount > 0 && !["PAID", "WAIVED"].includes(fee.status)));
      setTotalOutstanding(data.totalOutstanding);
      setFeeState("success");
    } catch {
      setFeeState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    studentApi
      .validateSession()
      .then((session) => {
        if (!active) return;
        if (session.studentSelected) {
          setView("fees");
          void loadFees();
        } else if (session.authenticated) {
          setView("search");
        } else {
          setView("login");
        }
      })
      .catch(() => active && setView("login"));
    return () => {
      active = false;
    };
  }, [loadFees]);

  function handleSelected(value: Student) {
    setStudent(value);
    setView("fees");
    void loadFees();
  }

  async function startPayment() {
    if (!fees.length || view === "processing") return;
    setView("processing");
    setPaymentError("");
    try {
      const order = await studentApi.createPayment(fees.map((fee) => fee.feeLedgerId));
      setPaymentOrder(order);
      if (isDemoMode) return;
      const result = await openRazorpayCheckout(
        order,
        tenantConfig.name,
        `${fees.length} outstanding ${fees.length === 1 ? "fee" : "fees"}`,
        tenantConfig.theme.primary,
      );
      setOutcome(result);
      setView("outcome");
    } catch {
      setPaymentError("We couldn’t create the payment request. Nothing has been charged. Please try again.");
      setView("confirmation");
    }
  }

  async function checkPaymentStatus() {
    setCheckingPayment(true);
    try {
      const data = await studentApi.getFees();
      const remaining = data.fees.filter(
        (fee) => fee.outstandingAmount > 0 && !["PAID", "WAIVED"].includes(fee.status),
      );
      if (remaining.length === 0) {
        setOutcome({
          kind: "success",
          receipt: {
            paymentId: outcome?.kind === "verifying" ? outcome.paymentId : "verified",
            amount: fees.reduce((sum, fee) => sum + fee.outstandingAmount, 0),
          },
        });
      }
    } finally {
      setCheckingPayment(false);
    }
  }

  function backToFees() {
    if (outcome?.kind === "success" && isDemoMode) {
      setFees([]);
      setTotalOutstanding(0);
    } else {
      void loadFees();
    }
    setPaymentOrder(null);
    setOutcome(null);
    setView("fees");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {view === "checking" && (
        <main className="grid min-h-screen place-items-center" role="status" aria-label="Checking portal session">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="music" className="h-6 w-6" />
            </div>
            <Spinner className="mx-auto mt-5 h-5 w-5 text-brand-600" />
          </div>
        </main>
      )}
      {view === "login" && <LoginScreen onAuthenticated={() => setView("search")} />}
      {view === "search" && (
        <SearchScreen onSelected={handleSelected} onBack={() => setView("login")} />
      )}
      {view === "fees" && (
        <FeesScreen
          student={student}
          fees={fees}
          totalOutstanding={totalOutstanding}
          onBack={() => setView("search")}
          onReview={() => setView("confirmation")}
          onRetry={loadFees}
          loading={feeState === "loading"}
          error={feeState === "error"}
        />
      )}
      {view === "confirmation" && (
        <PaymentConfirmation
          fees={fees}
          onBack={() => setView("fees")}
          onProceed={startPayment}
          submitting={false}
          error={paymentError}
        />
      )}
      {view === "processing" && !isDemoMode && <ProcessingScreen />}
      {view === "processing" && isDemoMode && !paymentOrder && <ProcessingScreen />}
      {view === "processing" && isDemoMode && paymentOrder && (
        <DemoGateway
          order={paymentOrder}
          onOutcome={(value) => {
            setOutcome(value);
            setView("outcome");
          }}
        />
      )}
      {view === "outcome" && outcome && (
        <OutcomeScreen
          outcome={outcome}
          fees={fees}
          checking={checkingPayment}
          onBack={backToFees}
          onRetry={() => setView("confirmation")}
          onCheckStatus={checkPaymentStatus}
        />
      )}
    </div>
  );
}
