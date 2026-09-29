"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface BillingData {
  subscription: {
    status: string;
    isPro: boolean;
    plan: "monthly" | "annual";
    priceId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    updatedAt: string;
  } | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: string;
    amountPaid: number;
    amountDue: number;
    amountRemaining: number;
    currency: string;
    createdAt: number;
    dueDate: number | null;
    hostedUrl: string | null;
    pdfUrl: string | null;
  }>;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
  }>;
  totals?: { totalPaid: number; overdue: number };
  usage: { importsThisMonth: number; layers: number };
}

interface BillingContextValue {
  data: BillingData | null;
  loading: boolean;
  error: string | null;
  isPro: boolean;
  refresh: () => Promise<void>;
}

const BillingContext = createContext<BillingContextValue>({
  data: null,
  loading: true,
  error: null,
  isPro: false,
  refresh: async () => {},
});

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "não foi possível consultar a assinatura");
        return;
      }
      setData(json as BillingData);
      setError(null);
    } catch {
      setError("não foi possível conectar ao serviço de assinatura");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, loading, error, isPro: data?.subscription?.isPro ?? false, refresh }),
    [data, loading, error, refresh]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export const useBilling = () => useContext(BillingContext);
