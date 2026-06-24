import { useState, useEffect, useCallback, useRef } from "react";
import "./Transactions.css";

const ID_API_URL =
  "https://script.google.com/macros/s/AKfycbyHyizEI2ZuZHS8CkUJPtsq8Wzi8FhEW1NmC1dC1Xc38AGZEaGnvfzXFIibKvidVQiF/exec";
const TX_API_URL =
  "https://script.google.com/macros/s/AKfycbyI0mky8b2qsTgwyCrkVPMGoUEL5KJ0c4mdONYwRVdqCJ3OyiG0h8xnEyt6Iwc5PaUa/exec";
const API_KEY = "72125bff3c984275973cbaa487e35f3a";

// TODO: replace with real accounts endpoint when available
const ACCOUNTS_API_URL = "https://hubcharge.micronocinc.com/management/api/settlement_accounts";

const TRANSACTION_TYPES = [
  { value: "receivable_charges", label: "Receivable Charges" },
  { value: "adjustments", label: "Adjustments" },
  { value: "payment_check", label: "Payment Check" },
  { value: "payment_eft", label: "Payment EFT" },
];

const EMPTY_FORM = {
  schedule_id: "",
  settlement_account_id: "",
  amount: "",
  description: "",
  transaction_time: "",
  transaction_type: "",
};

function dateToUnixMidnightPT(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = formatter.formatToParts(probe);
  const probeHour = parseInt(parts.find((p) => p.type === "hour").value, 10);
  const offsetHours = 12 - probeHour;
  const midnightPT = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
  return Math.floor(midnightPT.getTime() / 1000);
}

function localGeneratedId(prefix) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${id}`;
}

async function fetchGeneratedId(prefix) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(ID_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ apiKey: API_KEY, scope: "generateID", prefix }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const id = data.data ?? data.id ?? data.result ?? null;
    if (!id) throw new Error("empty response");
    return { id, local: false };
  } catch {
    clearTimeout(timeout);
    return { id: localGeneratedId(prefix), local: true };
  }
}

async function fetchSettlementAccounts(scheduleId) {
  // TODO: swap for real endpoint. Expected response: [{ settlement_account_id, entity, balance }]
  const res = await fetch(`${ACCOUNTS_API_URL}?schedule_id=${encodeURIComponent(scheduleId)}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Handle both array response and wrapped response
  return Array.isArray(data) ? data : (data.data ?? data.rows ?? []);
}

export default function Transactions() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [transactionId, setTransactionId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [idsLoading, setIdsLoading] = useState(true);
  const [idsLocal, setIdsLocal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status, statusCode, message }

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState(null);
  const lastFetchedScheduleId = useRef("");

  const generateIds = useCallback(async () => {
    setIdsLoading(true);
    setResult(null);
    try {
      const [tr, idk] = await Promise.all([
        fetchGeneratedId("tr"),
        fetchGeneratedId("id"),
      ]);
      setTransactionId(tr.id);
      setIdempotencyKey(idk.id);
      setIdsLocal(tr.local || idk.local);
    } catch {
      setTransactionId(localGeneratedId("tr"));
      setIdempotencyKey(localGeneratedId("id"));
      setIdsLocal(true);
    } finally {
      setIdsLoading(false);
    }
  }, []);

  useEffect(() => { generateIds(); }, [generateIds]);

  const loadAccounts = useCallback(async (scheduleId) => {
    const sid = scheduleId.trim();
    if (!sid || sid === lastFetchedScheduleId.current) return;
    lastFetchedScheduleId.current = sid;
    setAccountsLoading(true);
    setAccountsError(null);
    setAccounts([]);
    setForm((prev) => ({ ...prev, settlement_account_id: "" }));
    try {
      const rows = await fetchSettlementAccounts(sid);
      setAccounts(rows);
      if (rows.length === 1) {
        setForm((prev) => ({ ...prev, settlement_account_id: rows[0].settlement_account_id }));
      }
    } catch (err) {
      setAccountsError(err.message || "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResult(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleBlur = (e) => {
    if (e.target.value.trim()) loadAccounts(e.target.value.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);

    const payload = {
      apiKey: API_KEY,
      scope: "appendTransaction",
      transaction_id: transactionId,
      transaction_time: dateToUnixMidnightPT(form.transaction_time),
      transaction_type: form.transaction_type,
      settlement_account_id: form.settlement_account_id,
      schedule_id: form.schedule_id,
      amount: parseFloat(form.amount),
      currency: "USD",
      description: form.description,
      trigger_type: "manual_entry",
      trigger_id: null,
      idempotency_key: idempotencyKey,
    };

    try {
      const res = await fetch(TX_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult({
        status: data.status,
        statusCode: data.statusCode,
        message: data.message,
      });
      if (data.status === "success") {
        setForm(EMPTY_FORM);
        setAccounts([]);
        lastFetchedScheduleId.current = "";
        await generateIds();
      }
    } catch (err) {
      setResult({ status: "error", statusCode: null, message: err.message || "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = form.description.length;

  return (
    <div className="tx-page">
      <header className="tx-header">
        <div>
          <h1 className="tx-title">New Clearing Transaction</h1>
        </div>
        <div className="tx-ids-strip">
          <span className="tx-ids-item">
            <span className="tx-ids-key">TXN ID</span>
            <span className={`tx-ids-val${idsLoading ? " tx-ids-val--loading" : ""}`}>
              {idsLoading ? "generating…" : transactionId}
            </span>
          </span>
          <span className="tx-ids-dot">·</span>
          <span className="tx-ids-item">
            <span className="tx-ids-key">IDEMPOTENCY</span>
            <span className={`tx-ids-val${idsLoading ? " tx-ids-val--loading" : ""}`}>
              {idsLoading ? "generating…" : idempotencyKey}
            </span>
          </span>
          {!idsLoading && idsLocal && (
            <span className="tx-ids-local-badge" title="ID service unavailable — using locally generated IDs">
              local
            </span>
          )}
        </div>
      </header>

      <div className="tx-body">

        {result && (
          <div className={`tx-result tx-result--${result.status === "success" ? "success" : "error"}`}>
            <div className="tx-result-left">
              <span className="tx-result-icon">
                {result.status === "success" ? (
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
              <span className="tx-result-message">{result.message}</span>
            </div>
            {result.statusCode && (
              <span className="tx-result-code">{result.statusCode}</span>
            )}
          </div>
        )}

        <form className="tx-form" onSubmit={handleSubmit} noValidate>

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
              onBlur={handleScheduleBlur}
              required
            />
          </div>

          <div className="tx-field">
            <label className="tx-label" htmlFor="settlement_account_id">
              Settlement Account
              {accountsLoading && <span className="tx-accounts-loading">Fetching accounts…</span>}
            </label>
            {accounts.length > 0 ? (
              <select
                id="settlement_account_id"
                name="settlement_account_id"
                className="tx-select"
                value={form.settlement_account_id}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select account…</option>
                {accounts.map((a) => (
                  <option key={a.settlement_account_id} value={a.settlement_account_id}>
                    {a.settlement_account_id} · {a.entity} · ${Number(a.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="settlement_account_id"
                name="settlement_account_id"
                type="text"
                className={`tx-input${accountsLoading ? " tx-input--loading" : ""}`}
                placeholder={accountsLoading ? "Loading accounts…" : accountsError ? `Error: ${accountsError}` : "Enter Schedule ID above to load accounts"}
                value={form.settlement_account_id}
                onChange={handleChange}
                disabled={accountsLoading}
                required
              />
            )}
            {accountsError && (
              <span className="tx-hint tx-hint--error">{accountsError}</span>
            )}
          </div>

          <div className="tx-field">
            <label className="tx-label" htmlFor="amount">Amount (USD)</label>
            <div className="tx-amount-wrap">
              <span className="tx-amount-prefix">$</span>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                className="tx-input tx-input--amount"
                placeholder="0.00"
                value={form.amount}
                onChange={handleChange}
                required
              />
              <span className="tx-amount-suffix">USD</span>
            </div>
          </div>

          <div className="tx-field">
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

          <div className="tx-actions">
            <button
              type="button"
              className="tx-btn tx-btn--ghost"
              onClick={() => {
                setForm(EMPTY_FORM);
                setResult(null);
                setAccounts([]);
                lastFetchedScheduleId.current = "";
              }}
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
                <><span className="tx-spinner" />Submitting…</>
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
