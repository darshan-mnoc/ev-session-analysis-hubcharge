import { useState, useEffect, useCallback } from "react";
import "./Transactions.css";
import { apiClient } from "./api/apiClient";

const TRANSACTION_TYPES = [
  { value: "receivable_charges", label: "Receivable Charges" },
  { value: "adjustments", label: "Adjustments" },
  { value: "payment_check", label: "Payment Check" },
  { value: "payment_eft", label: "Payment EFT" },
];

const TRIGGER_TYPES = [
  { value: "payment_check", label: "Payment Check" },
  { value: "payment_eft", label: "Payment EFT" },
  { value: "settlement_run", label: "Settlement Run" },
];

const EMPTY_FORM = {
  transaction_time: "",
  transaction_type: "",
  settlement_account_id: "",
  schedule_id: "",
  amount: "",
  description: "",
  trigger_type: "",
};

// Convert a local date string (YYYY-MM-DD) to Unix timestamp for midnight PT.
function dateToUnixMidnightPT(dateStr) {
  // Construct an ISO string that Intl can interpret as midnight in PT.
  // We rely on the fact that toLocaleString with timeZone gives us the offset,
  // but the simplest cross-browser approach is to use Date with a UTC offset
  // adjustment. We use the Intl approach via a dummy parse.
  const [year, month, day] = dateStr.split("-").map(Number);
  // Build a Date representing midnight local wall-clock in America/Los_Angeles.
  // We do this by finding what UTC time corresponds to midnight PT on that date.
  const dtUtc = new Date(Date.UTC(year, month - 1, day, 8, 0, 0)); // 8 AM UTC ≈ midnight PST
  // Verify by formatting and adjusting for DST.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // Binary-search approach: start at noon UTC on that date, walk backwards.
  // Simpler: use the offset trick.
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = formatter.formatToParts(probe);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  // Reconstruct what UTC time corresponds to midnight PT on that calendar day.
  const probeHour = parseInt(p.hour, 10); // PT hour at noon UTC
  // At noon UTC, PT is noon UTC minus offset. offset = noon UTC hour in PT wall clock... no.
  // Actually: if at noon UTC the PT wall clock shows hour H, then
  // UTC offset = 12 - H (in hours, positive means behind UTC).
  // Midnight PT (0:00) = UTC (0 + offset) = offset hours UTC.
  const offsetHours = 12 - probeHour;
  const midnightPT = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
  return Math.floor(midnightPT.getTime() / 1000);
}

// Stub: replace with real Toolbox.generatedId16 endpoint when available.
async function fetchGeneratedId(prefix) {
  // TODO: replace with real API call e.g.:
  // return apiClient.get(`/toolbox/generatedId16/${prefix}`).then(r => r.id);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${id}`;
}

export default function Transactions() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [transactionId, setTransactionId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [idsLoading, setIdsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null); // { type: "success"|"error", message: string }

  const generateIds = useCallback(async () => {
    setIdsLoading(true);
    setBanner(null);
    try {
      const [trId, idKey] = await Promise.all([
        fetchGeneratedId("tr"),
        fetchGeneratedId("id"),
      ]);
      setTransactionId(trId);
      setIdempotencyKey(idKey);
    } catch {
      setTransactionId("Error generating ID");
      setIdempotencyKey("Error generating ID");
    } finally {
      setIdsLoading(false);
    }
  }, []);

  useEffect(() => {
    generateIds();
  }, [generateIds]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBanner(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);
    setSubmitting(true);

    const body = {
      transaction_id: transactionId,
      transaction_time: dateToUnixMidnightPT(form.transaction_time),
      transaction_type: form.transaction_type,
      settlement_account_id: form.settlement_account_id,
      schedule_id: form.schedule_id,
      amount: parseFloat(form.amount),
      currency: "USD",
      description: form.description,
      trigger_type: form.trigger_type,
      trigger_id: null,
      idempotency_key: idempotencyKey,
    };

    try {
      // TODO: replace endpoint with real POST URL when available.
      const res = await apiClient.post("/transactions", body);
      setBanner({ type: "success", message: res.message || "Transaction submitted." });
      setForm(EMPTY_FORM);
      await generateIds();
    } catch (err) {
      setBanner({ type: "error", message: err.message || "Submission failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = form.description.length;

  return (
    <div className="tx-page">
      <header className="tx-header">
        <h1 className="tx-title">New Transaction</h1>
        <p className="tx-subtitle">Append an entry to the clearing ledger</p>
      </header>

      <div className="tx-body">
      {banner && (
        <div className={`tx-banner tx-banner--${banner.type}`}>
          <span className="tx-banner-icon">
            {banner.type === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>
          {banner.message}
        </div>
      )}

      <form className="tx-form" onSubmit={handleSubmit} noValidate>
        {/* System-generated row */}
        <div className="tx-section-label">System Generated</div>
        <div className="tx-row tx-row--2col">
          <div className="tx-field">
            <label className="tx-label">Transaction ID</label>
            <div className={`tx-readonly-input ${idsLoading ? "tx-readonly-input--loading" : ""}`}>
              {idsLoading ? <span className="tx-generating">Generating…</span> : transactionId}
            </div>
          </div>
          <div className="tx-field">
            <label className="tx-label">Idempotency Key</label>
            <div className={`tx-readonly-input ${idsLoading ? "tx-readonly-input--loading" : ""}`}>
              {idsLoading ? <span className="tx-generating">Generating…</span> : idempotencyKey}
            </div>
          </div>
        </div>

        {/* User input fields */}
        <div className="tx-section-label">Transaction Details</div>
        <div className="tx-row tx-row--2col">
          <div className="tx-field">
            <label className="tx-label" htmlFor="transaction_time">Transaction Date</label>
            <input
              id="transaction_time"
              name="transaction_time"
              type="date"
              className="tx-input"
              value={form.transaction_time}
              onChange={handleChange}
              required
            />
            <span className="tx-hint">Converted to midnight PT on submit</span>
          </div>
          <div className="tx-field">
            <label className="tx-label" htmlFor="transaction_type">Transaction Type</label>
            <select
              id="transaction_type"
              name="transaction_type"
              className="tx-select"
              value={form.transaction_type}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select type…</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="tx-row tx-row--2col">
          <div className="tx-field">
            <label className="tx-label" htmlFor="settlement_account_id">Settlement Account ID</label>
            <input
              id="settlement_account_id"
              name="settlement_account_id"
              type="text"
              className="tx-input"
              placeholder="e.g. B3000200000"
              value={form.settlement_account_id}
              onChange={handleChange}
              required
            />
          </div>
          <div className="tx-field">
            <label className="tx-label" htmlFor="schedule_id">Schedule ID</label>
            <input
              id="schedule_id"
              name="schedule_id"
              type="text"
              className="tx-input"
              placeholder="e.g. sch_kzIlx7QPRujhrbBv"
              value={form.schedule_id}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="tx-row tx-row--3col">
          <div className="tx-field">
            <label className="tx-label" htmlFor="amount">Amount</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              className="tx-input"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className="tx-field">
            <label className="tx-label">Currency</label>
            <div className="tx-readonly-input tx-readonly-input--fixed">USD</div>
          </div>
          <div className="tx-field">
            <label className="tx-label">Trigger ID</label>
            <div className="tx-readonly-input tx-readonly-input--fixed">null</div>
          </div>
        </div>

        <div className="tx-row tx-row--2col">
          <div className="tx-field">
            <label className="tx-label" htmlFor="trigger_type">Trigger Type</label>
            <select
              id="trigger_type"
              name="trigger_type"
              className="tx-select"
              value={form.trigger_type}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select trigger…</option>
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="tx-row">
          <div className="tx-field tx-field--full">
            <label className="tx-label" htmlFor="description">
              Description
              <span className={`tx-char-count ${charCount > 240 ? "tx-char-count--warn" : ""}`}>
                {charCount}/250
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              className="tx-textarea"
              placeholder="e.g. Charges for 10/15/24 – 11/13/24"
              maxLength={250}
              rows={3}
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="tx-actions">
          <button
            type="button"
            className="tx-btn tx-btn--ghost"
            onClick={() => { setForm(EMPTY_FORM); setBanner(null); }}
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="submit"
            className="tx-btn tx-btn--primary"
            disabled={submitting || idsLoading}
          >
            {submitting ? (
              <>
                <span className="tx-spinner" />
                Submitting…
              </>
            ) : (
              "Submit Transaction"
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
