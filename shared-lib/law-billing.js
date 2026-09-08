// shared-lib/law-billing.js
// Retainer billing calculation logic shared by ContractCreateForm.js,
// ContractPaymentScheduleDetailBlock.js, and PaymentRequestCreateBlock.js.
// Load via: const Shared = await ctx.importAsync(LAW_BILLING_URL);
// Deploy convention: see shared-lib/README.md (versioned filename, e.g.
// law-billing-v1.js — do not overwrite an existing version's URL).

export const VERSION = '1.0.0';

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function toDateInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateInput(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : toDateInput(date);
}

function addDays(dateValue, days) {
  if (!dateValue && days !== 0) return '';
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  source.setDate(source.getDate() + days);
  return toDateInput(source);
}

function addMonthsClamped(dateValue, monthCount) {
  if (!dateValue || !monthCount) return '';
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  const y = source.getFullYear();
  const m = source.getMonth();
  const d = source.getDate();
  const targetFirst = new Date(y, m + monthCount, 1);
  const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate();
  targetFirst.setDate(Math.min(d, lastDay));
  return toDateInput(targetFirst);
}

export function normalizeRetainerUnit(unit) {
  const key = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (key === 'daily') return 'day';
  if (key === 'weekly') return 'week';
  if (key === 'monthly') return 'month';
  if (key === 'quarterly') return 'quarter';
  if (key === 'yearly' || key === 'annual') return 'year';
  return key || 'month';
}

export function calcRetainerNextPaymentDate(paymentDate, retainerDuration, repeatUnit) {
  const duration = parseNum(retainerDuration);
  const unit = normalizeRetainerUnit(repeatUnit);
  if (!paymentDate || duration <= 0) return '';
  if (unit === 'day') return addDays(paymentDate, duration);
  if (unit === 'week') return addDays(paymentDate, duration * 7);
  if (unit === 'month') return addMonthsClamped(paymentDate, duration);
  if (unit === 'quarter') return addMonthsClamped(paymentDate, duration * 3);
  if (unit === 'year') return addMonthsClamped(paymentDate, duration * 12);
  return '';
}

export function retainerDurationSuffix(retainerPeriod, durationValue) {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === 'day') return singular ? 'day' : 'days';
  if (retainerPeriod === 'week') return singular ? 'week' : 'weeks';
  if (retainerPeriod === 'month') return singular ? 'month' : 'months';
  if (retainerPeriod === 'quarter') return singular ? 'quarter' : 'quarters';
  if (retainerPeriod === 'year') return singular ? 'year' : 'years';
  return singular ? 'cycle' : 'cycles';
}

// Replaces the old resolveRetainerNextPaymentDate pattern (which always
// recomputed "startDate + 1 unit" and had no way to know how many cycles
// had actually been auto-billed). Once a plan exists, its own
// nextBillingDate *is* the live, correct next-payment date — this reads
// it directly instead of approximating it a second time.
export function resolveActiveBillingPlanDisplay(plan) {
  if (!plan) return null;
  const totalCycles = plan.retainerTotalCycles ?? null;
  const cyclesBilled = plan.retainerCyclesBilled ?? 0;
  if (plan.nextBillingDate) {
    return {
      nextPaymentDate: normalizeDateInput(plan.nextBillingDate),
      cyclesBilled,
      totalCycles,
      displayText: totalCycles
        ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
        : `Every ${plan.retainerUnit} · open-ended`,
    };
  }
  // Plan exists but automation hasn't initialized nextBillingDate yet
  // (e.g. open-ended plan, or not yet saved) — best-effort preview only.
  return {
    nextPaymentDate: calcRetainerNextPaymentDate(plan.startDate, 1, plan.retainerUnit),
    cyclesBilled,
    totalCycles,
    displayText: totalCycles
      ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
      : `Every ${plan.retainerUnit} · open-ended`,
  };
}
