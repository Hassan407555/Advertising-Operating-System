"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Link2,
  Link2Off,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { usePermission } from "@/hooks/use-permission";
import { getAdAccountsForCampaigns } from "@/features/campaigns/api/ad-accounts.api";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import {
  useActiveStoreSummaryQuery,
  useAdvertisingConfigurationQuery,
  useUpsertAdvertisingConfigurationMutation,
} from "@/features/stores/hooks/use-advertising-configuration";
import {
  useConnectMetaMutation,
  useDisconnectMetaMutation,
  useMetaAdAccountsQuery,
  useMetaBusinessesQuery,
  useMetaCatalogsQuery,
  useMetaConnectionQuery,
  useMetaInstagramAccountsQuery,
  useMetaPagesQuery,
  useMetaPixelsQuery,
} from "@/features/meta/hooks/use-meta";
import { isAllowedMetaAuthorizationUrl } from "@/lib/navigation/meta-oauth";
import {
  buildAdvertisingPathPreservingReturn,
  clearJourneyReturnTo,
  peekJourneyReturnTo,
  resolveJourneyReturnTo,
  resolveSetupCompletionPath,
} from "@/lib/navigation/journey-return";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { PaginatedResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";
import { deriveCampaignReadiness } from "@/features/campaign-readiness/lib/derive-campaign-readiness";
import type { CampaignReadinessModel } from "@/features/campaign-readiness/types/campaign-readiness.types";

const SAVE_FLOW_LOG = "[AdvertisingSave]";

function logSaveStep(step: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.info(SAVE_FLOW_LOG, step, detail);
    return;
  }
  console.info(SAVE_FLOW_LOG, step);
}

interface MetaConnectionOption {
  id: string;
  accountName: string;
  accountId: string;
  status: string;
}

const WIZARD_STEPS = [
  {
    id: "readiness",
    title: "Readiness",
    description: "Store health and advertising prerequisites.",
    icon: ShieldCheck,
  },
  {
    id: "meta",
    title: "Meta Connection",
    description: "Link Meta, Business Manager, and ad account.",
    icon: Link2,
  },
  {
    id: "resources",
    title: "Resources",
    description: "Page, Instagram, pixel, and catalog IDs.",
    icon: Settings2,
  },
  {
    id: "review",
    title: "Review & Save",
    description: "Confirm everything, then save once.",
    icon: CheckCircle2,
  },
] as const;

type WizardStepIndex = 0 | 1 | 2 | 3;

const selectClassName = cn(
  "flex h-9 w-full rounded-[var(--radius-md)] bg-input/40",
  "border border-border/60 shadow-[var(--shadow-xs)]",
  "px-3 text-sm text-foreground outline-none transition-surface",
  "hover:border-border focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

async function listMetaConnections(): Promise<MetaConnectionOption[]> {
  const response = await apiClient.get("/platform-connections", {
    params: {
      platform: "META",
      status: "ACTIVE",
      page: 1,
      limit: 100,
      sortBy: "accountName",
      sortOrder: "asc",
    },
  });
  const payload = unwrapEnvelope<PaginatedResponse<MetaConnectionOption>>(response.data);
  return payload.data ?? [];
}

function ReadinessList({
  readiness,
  reasons = [],
}: {
  readiness: CampaignReadinessModel;
  reasons?: string[];
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-1 text-sm text-muted-foreground">
        {readiness.steps.map((step) => (
          <li key={step.id}>
            {step.done ? "✓" : step.required ? "✗" : "○"} {step.label}
          </li>
        ))}
      </ul>
      <p className="text-sm">
        Meta advertising configured:{" "}
        <strong>{readiness.flags.metaAdvertisingConfigured ? "Yes" : "No"}</strong>
      </p>
      <p className="text-sm">
        Ready to Publish:{" "}
        <strong>{readiness.flags.readyToPublish ? "Yes" : "No"}</strong>
      </p>
      {reasons?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FieldShell({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function AdvertisingConfigurationForm() {
  const canManage = usePermission("manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeStore, refreshStores } = useActiveStore();
  const storeId = activeStore!.id;

  const summaryQuery = useActiveStoreSummaryQuery();
  const configQuery = useAdvertisingConfigurationQuery(storeId);
  const saveMutation = useUpsertAdvertisingConfigurationMutation(storeId);

  const adAccountsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_ACCOUNTS,
    queryFn: getAdAccountsForCampaigns,
  });

  const metaConnectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.STORES, "meta-connections"],
    queryFn: listMetaConnections,
  });

  const metaConnectionQuery = useMetaConnectionQuery();
  const oauthConnected = Boolean(metaConnectionQuery.data?.connected);
  const connectMetaMutation = useConnectMetaMutation();
  const disconnectMetaMutation = useDisconnectMetaMutation();

  const [step, setStep] = useState<WizardStepIndex>(3);
  const [metaPlatformConnectionId, setMetaPlatformConnectionId] = useState("");
  const [metaBusinessId, setMetaBusinessId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [sidebarSaveSuccess, setSidebarSaveSuccess] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    const queryReturn = searchParams.get("returnTo");
    const metaStatus = searchParams.get("meta");

    if (queryReturn) {
      setReturnTo(resolveJourneyReturnTo(queryReturn));
      return;
    }

    // OAuth callback may briefly lack returnTo; keep session storage until cleanup rewrite.
    if (metaStatus) {
      setReturnTo(peekJourneyReturnTo());
      return;
    }

    // Sidebar / direct visit — do not inherit a stale campaign return path.
    clearJourneyReturnTo();
    setReturnTo(null);
  }, [searchParams]);

  const businessesQuery = useMetaBusinessesQuery(oauthConnected);
  const remoteAdAccountsQuery = useMetaAdAccountsQuery(
    metaBusinessId || undefined,
    oauthConnected,
  );
  const pagesQuery = useMetaPagesQuery(oauthConnected);

  const selectedRemoteAdAccount = (remoteAdAccountsQuery.data ?? []).find(
    (account) => account.localAdAccountId === adAccountId,
  );
  const selectedLocalAdAccount = (adAccountsQuery.data ?? []).find(
    (account) => account.id === adAccountId,
  );
  const metaAdAccountExternalId =
    selectedRemoteAdAccount?.id ||
    selectedLocalAdAccount?.externalId ||
    undefined;

  const instagramAccountsQuery = useMetaInstagramAccountsQuery(
    facebookPageId || undefined,
    oauthConnected,
  );
  const pixelsQuery = useMetaPixelsQuery(
    {
      businessId: metaBusinessId || undefined,
      adAccountId: metaAdAccountExternalId,
    },
    oauthConnected,
  );
  const catalogsQuery = useMetaCatalogsQuery(
    metaBusinessId || undefined,
    oauthConnected,
  );

  useEffect(() => {
    const metaStatus = searchParams.get("meta");
    if (!metaStatus) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const finishOAuthCleanup = () => {
        if (cancelled) {
          return;
        }
        // Stay on Advertising after OAuth so the user can select destinations and Save.
        // Return-to-campaign happens only from onSave when returnTo is set.
        router.replace(
          buildAdvertisingPathPreservingReturn(searchParams.get("returnTo")),
        );
      };

      if (metaStatus === "connected") {
        const connectionId = searchParams.get("connectionId");
        toast.success("Meta connected successfully.");
        setStep(1);
        if (connectionId) {
          setMetaPlatformConnectionId(connectionId);
        }
        // Rehydrate + put returnTo back on the URL immediately (callback omits it).
        // Must run before async refetches so the returnTo effect cannot clear the journey.
        const restored = resolveJourneyReturnTo(searchParams.get("returnTo"));
        setReturnTo(restored);
        finishOAuthCleanup();
        void Promise.all([
          metaConnectionQuery.refetch(),
          metaConnectionsQuery.refetch(),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_BUSINESSES }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_AD_ACCOUNTS }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_PAGES }),
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.META_INSTAGRAM_ACCOUNTS,
          }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_PIXELS }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_CATALOGS }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_ACCOUNTS }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORES }),
          refreshStores(),
        ]);
        return;
      }

      if (metaStatus === "error") {
        toast.error(
          searchParams.get("message") || "Meta connection failed. Try again.",
        );
        setStep(1);
      }

      finishOAuthCleanup();
    });

    return () => {
      cancelled = true;
    };
    // Intentionally run once when OAuth returns with query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (configQuery.isLoading || configQuery.isFetching) {
      return;
    }

    const config = configQuery.data;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      if (!config) {
        setMetaPlatformConnectionId("");
        setMetaBusinessId("");
        setAdAccountId("");
        setFacebookPageId("");
        setInstagramAccountId("");
        setPixelId("");
        setCatalogId("");
        return;
      }

      setMetaPlatformConnectionId(config.metaPlatformConnectionId ?? "");
      setMetaBusinessId(config.metaBusinessId ?? "");
      setAdAccountId(config.adAccountId ?? "");
      setFacebookPageId(config.facebookPageId ?? "");
      setInstagramAccountId(config.instagramAccountId ?? "");
      setPixelId(config.pixelId ?? "");
      setCatalogId(config.catalogId ?? "");
    });

    return () => {
      cancelled = true;
    };
  }, [configQuery.data, configQuery.isLoading, configQuery.isFetching, storeId]);

  const resolvedMetaPlatformConnectionId =
    metaPlatformConnectionId || metaConnectionQuery.data?.id || "";

  const summary = summaryQuery.data;
  const capabilities = summary?.capabilities;
  const readiness = deriveCampaignReadiness({
    capabilities,
    hasCampaignGenerated: false,
    isLive: false,
  });
  const metaAdAccounts = (adAccountsQuery.data ?? []).filter(
    (account) => account.platform === "META" || !account.platform,
  );

  const isLoading = summaryQuery.isLoading || configQuery.isLoading;
  const hasError = summaryQuery.isError || configQuery.isError;
  const hasConfig = Boolean(configQuery.data);
  const progressPercent = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);
  const current = WIZARD_STEPS[step];
  const CurrentIcon = current.icon;
  const fieldsDisabled = !canManage || saveMutation.isPending;

  const onConnectMeta = async () => {
    if (!canManage) {
      toast.error("Your role cannot manage Meta connections.");
      return;
    }

    try {
      // Persist journey return before leaving the origin — Meta callback omits returnTo.
      resolveJourneyReturnTo(searchParams.get("returnTo") ?? returnTo);
      const response = await connectMetaMutation.mutateAsync({ storeId });
      if (!isAllowedMetaAuthorizationUrl(response.authorizationUrl)) {
        toast.error("Meta returned an unexpected authorization URL.");
        return;
      }
      window.location.href = response.authorizationUrl;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start Meta connection."));
    }
  };

  const onDisconnectMeta = async () => {
    if (!canManage) {
      toast.error("Your role cannot manage Meta connections.");
      return;
    }

    try {
      await disconnectMetaMutation.mutateAsync();
      await metaConnectionsQuery.refetch();
      await adAccountsQuery.refetch();
      await refreshStores();
      toast.success("Meta disconnected.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disconnect Meta."));
    }
  };

  const onSave = async () => {
    logSaveStep("STEP 1 Save button clicked", {
      storeId,
      returnToState: returnTo,
      returnToQuery: searchParams.get("returnTo"),
      returnToPeek: peekJourneyReturnTo(),
    });

    // Resolve at click time — React state alone can be null after OAuth URL cleanup.
    const nextPath = resolveSetupCompletionPath(
      searchParams.get("returnTo"),
      returnTo ?? undefined,
    );

    logSaveStep("STEP 2 Validation passed", {
      nextPath,
      adAccountId: adAccountId || null,
      facebookPageId: facebookPageId || null,
      pixelId: pixelId || null,
      metaPlatformConnectionId: resolvedMetaPlatformConnectionId || null,
      metaBusinessId: metaBusinessId || null,
    });

    const payload = {
      metaPlatformConnectionId: resolvedMetaPlatformConnectionId || null,
      metaBusinessId: metaBusinessId || null,
      adAccountId: adAccountId || null,
      facebookPageId: facebookPageId || null,
      instagramAccountId: instagramAccountId || null,
      pixelId: pixelId || null,
      catalogId: catalogId || null,
    };

    try {
      logSaveStep("STEP 3 Saving Meta configuration", payload);
      const saved = await saveMutation.mutateAsync(payload);
      logSaveStep("STEP 4 API response", {
        id: saved?.id,
        adAccountId: saved?.adAccountId,
        facebookPageId: saved?.facebookPageId,
        pixelId: saved?.pixelId,
      });

      logSaveStep("STEP 5 Campaign updated — refreshing store readiness");
      try {
        await refreshStores();
        await Promise.all([
          summaryQuery.refetch(),
          configQuery.refetch(),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        ]);
      } catch (refreshError) {
        // Save already succeeded; do not block navigation on refresh failures.
        console.warn(SAVE_FLOW_LOG, "STEP 5 refresh failed (non-fatal)", refreshError);
      }

      toast.success("Advertising configuration saved.");

      if (nextPath) {
        logSaveStep("STEP 6 Navigation to Publishing Checklist", { nextPath });
        clearJourneyReturnTo();
        setSidebarSaveSuccess(false);
        setReturnTo(null);
        void router.push(nextPath);
        return;
      }

      // Stop point when no journey return path exists (sidebar / direct visit).
      logSaveStep("STEP 6 SKIPPED — no returnTo; staying on Advertising", {
        reason: "resolveSetupCompletionPath returned null",
        line: "onSave: setSidebarSaveSuccess(true)",
      });
      setSidebarSaveSuccess(true);
    } catch (error) {
      console.error(SAVE_FLOW_LOG, "STOP — mutation/API failed", error);
      toast.error(getErrorMessage(error, "Unable to save advertising configuration."));
    }
  };

  if (isLoading) {
    return <PageLoading cards={2} />;
  }

  if (hasError) {
    return (
      <PageError
        title="Unable to load advertising configuration"
        message={getErrorMessage(
          summaryQuery.error ?? configQuery.error,
          "Advertising configuration could not be loaded.",
        )}
        onRetry={() => {
          summaryQuery.refetch();
          configQuery.refetch();
        }}
      />
    );
  }

  const metaFields = (
    <div className="section-stack">
      <div className="rounded-[var(--radius-lg)] border border-border/50 bg-muted/20 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {oauthConnected ? "Meta OAuth connected" : "Connect Meta via OAuth"}
            </p>
            <p className="mt-1 text-body-sm">
              {oauthConnected
                ? `${metaConnectionQuery.data?.accountName ?? "Meta account"} · ${metaConnectionQuery.data?.accountId ?? ""}`
                : "Authorize Meta to load businesses, ad accounts, and pages from Graph API."}
            </p>
          </div>
          {oauthConnected ? (
            <StatusBadge status={metaConnectionQuery.data?.status ?? "ACTIVE"} />
          ) : null}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onConnectMeta}
              disabled={connectMetaMutation.isPending}
            >
              <Link2 className="size-3.5" aria-hidden />
              {oauthConnected
                ? connectMetaMutation.isPending
                  ? "Reconnecting…"
                  : "Reconnect Meta"
                : connectMetaMutation.isPending
                  ? "Connecting…"
                  : "Connect Meta"}
            </Button>
            {oauthConnected ? (
              <Button
                type="button"
                variant="outline"
                onClick={onDisconnectMeta}
                disabled={disconnectMetaMutation.isPending}
              >
                <Link2Off className="size-3.5" aria-hidden />
                {disconnectMetaMutation.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {oauthConnected ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldShell label="Load business" htmlFor="adv-meta-business-picker">
              <select
                id="adv-meta-business-picker"
                className={selectClassName}
                value={metaBusinessId}
                disabled={fieldsDisabled || businessesQuery.isLoading}
                onChange={(event) => {
                  setMetaBusinessId(event.target.value);
                  setAdAccountId("");
                  setPixelId("");
                  setCatalogId("");
                }}
              >
                <option value="">Choose from Meta…</option>
                {(businessesQuery.data ?? []).map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Load ad account" htmlFor="adv-meta-ad-account-picker">
              <select
                id="adv-meta-ad-account-picker"
                className={selectClassName}
                value={adAccountId}
                disabled={fieldsDisabled || remoteAdAccountsQuery.isLoading}
                onChange={(event) => {
                  setAdAccountId(event.target.value);
                  setPixelId("");
                }}
              >
                <option value="">Choose from Meta…</option>
                {(remoteAdAccountsQuery.data ?? [])
                  .filter((account) => account.localAdAccountId)
                  .map((account) => (
                    <option key={account.id} value={account.localAdAccountId!}>
                      {account.name} ({account.accountId})
                    </option>
                  ))}
              </select>
            </FieldShell>

            <FieldShell label="Load Facebook Page" htmlFor="adv-meta-page-picker">
              <select
                id="adv-meta-page-picker"
                className={selectClassName}
                value={facebookPageId}
                disabled={fieldsDisabled || pagesQuery.isLoading}
                onChange={(event) => {
                  setFacebookPageId(event.target.value);
                  setInstagramAccountId("");
                }}
              >
                <option value="">Choose from Meta…</option>
                {(pagesQuery.data ?? []).map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </FieldShell>
          </div>
        ) : null}
      </div>

      <FieldShell label="Meta connection" htmlFor="adv-meta-connection">
        <select
          id="adv-meta-connection"
          className={selectClassName}
          value={resolvedMetaPlatformConnectionId}
          disabled={fieldsDisabled}
          onChange={(event) => setMetaPlatformConnectionId(event.target.value)}
        >
          <option value="">Not selected</option>
          {(metaConnectionsQuery.data ?? []).map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.accountName || connection.accountId}
            </option>
          ))}
        </select>
      </FieldShell>

      <FieldShell label="Meta Business ID" htmlFor="adv-meta-business-id">
        <Input
          id="adv-meta-business-id"
          value={metaBusinessId}
          disabled={fieldsDisabled}
          onChange={(event) => setMetaBusinessId(event.target.value)}
          placeholder="External Meta Business Manager ID"
        />
      </FieldShell>

      <FieldShell label="Ad account" htmlFor="adv-ad-account">
        <select
          id="adv-ad-account"
          className={selectClassName}
          value={adAccountId}
          disabled={fieldsDisabled || adAccountsQuery.isLoading}
          onChange={(event) => setAdAccountId(event.target.value)}
        >
          <option value="">Not selected</option>
          {metaAdAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountName} ({account.externalId})
            </option>
          ))}
        </select>
      </FieldShell>
    </div>
  );

  const resourceFields = (
    <div className="section-stack">
      <FieldShell label="Facebook Page" htmlFor="adv-facebook-page-id">
        <select
          id="adv-facebook-page-id"
          className={selectClassName}
          value={facebookPageId}
          disabled={fieldsDisabled || (oauthConnected && pagesQuery.isLoading)}
          onChange={(event) => {
            setFacebookPageId(event.target.value);
            setInstagramAccountId("");
          }}
        >
          <option value="">Not selected</option>
          {facebookPageId &&
          !(pagesQuery.data ?? []).some((page) => page.id === facebookPageId) ? (
            <option value={facebookPageId}>{facebookPageId}</option>
          ) : null}
          {(pagesQuery.data ?? []).map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </FieldShell>

      <FieldShell label="Instagram account" htmlFor="adv-instagram-account-id">
        <select
          id="adv-instagram-account-id"
          className={selectClassName}
          value={instagramAccountId}
          disabled={
            fieldsDisabled ||
            (oauthConnected && instagramAccountsQuery.isLoading)
          }
          onChange={(event) => setInstagramAccountId(event.target.value)}
        >
          <option value="">Not selected</option>
          {instagramAccountId &&
          !(instagramAccountsQuery.data ?? []).some(
            (account) => account.id === instagramAccountId,
          ) ? (
            <option value={instagramAccountId}>{instagramAccountId}</option>
          ) : null}
          {(instagramAccountsQuery.data ?? []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.username
                ? `@${account.username}`
                : account.name || account.id}
            </option>
          ))}
        </select>
      </FieldShell>

      <FieldShell label="Pixel" htmlFor="adv-pixel-id">
        <select
          id="adv-pixel-id"
          className={selectClassName}
          value={pixelId}
          disabled={fieldsDisabled || (oauthConnected && pixelsQuery.isLoading)}
          onChange={(event) => setPixelId(event.target.value)}
        >
          <option value="">Not selected</option>
          {pixelId &&
          !(pixelsQuery.data ?? []).some((pixel) => pixel.id === pixelId) ? (
            <option value={pixelId}>{pixelId}</option>
          ) : null}
          {(pixelsQuery.data ?? []).map((pixel) => (
            <option key={pixel.id} value={pixel.id}>
              {pixel.name}
            </option>
          ))}
        </select>
      </FieldShell>

      <FieldShell label="Catalog" htmlFor="adv-catalog-id">
        <select
          id="adv-catalog-id"
          className={selectClassName}
          value={catalogId}
          disabled={
            fieldsDisabled || (oauthConnected && catalogsQuery.isLoading)
          }
          onChange={(event) => setCatalogId(event.target.value)}
        >
          <option value="">Not selected</option>
          {catalogId &&
          !(catalogsQuery.data ?? []).some(
            (catalog) => catalog.id === catalogId,
          ) ? (
            <option value={catalogId}>{catalogId}</option>
          ) : null}
          {(catalogsQuery.data ?? []).map((catalog) => (
            <option key={catalog.id} value={catalog.id}>
              {catalog.name}
            </option>
          ))}
        </select>
      </FieldShell>
    </div>
  );

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Workspace"
        title="Advertising Configuration"
        description={
          returnTo
            ? `Configure Meta advertising for ${activeStore!.name}, then return to your campaign to publish.`
            : `Configure Meta advertising destinations for store ${activeStore!.name}.`
        }
      />

      <Card variant="elevated" padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            size="sm"
            title="Setup wizard"
            description={`Step ${step + 1} of ${WIZARD_STEPS.length}: ${current.title}`}
          />
          <p className="text-caption tabular-nums">{progressPercent}%</p>
        </div>
        <Progress value={progressPercent} label="Advertising configuration progress" />
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WIZARD_STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const done = index < step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStep(index as WizardStepIndex)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2 text-left text-xs font-medium transition-surface",
                    done && "bg-success-muted/50 text-success",
                    active && "bg-primary-muted text-primary-muted-foreground",
                    !done && !active && "bg-muted/40 text-muted-foreground",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card variant="elevated" padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/60 text-muted-foreground">
              <CurrentIcon className="size-4" aria-hidden />
            </span>
            <SectionHeader
              title={current.title}
              description={current.description}
              titleId={`adv-step-${current.id}`}
            />
          </div>
          {step === 0 ? <StatusBadge status={summary?.health?.status ?? "NOT_READY"} /> : null}
        </div>

        {!canManage ? (
          <p className="text-body-sm">
            You can view configuration. Only owners and admins can save changes.
          </p>
        ) : null}

        {!hasConfig ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            No configuration.
          </p>
        ) : null}

        {sidebarSaveSuccess && !returnTo ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Configuration saved successfully.</p>
              <p className="text-body-sm">
                Advertising setup is ready. Open a campaign draft when you are ready to publish.
              </p>
            </div>
          </div>
        ) : null}

        {returnTo ? (
          <p className="rounded-[var(--radius-lg)] border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            After you save, you will return to your campaign to publish.
          </p>
        ) : null}

        {step === 0 ? (
          <ReadinessList
            readiness={readiness}
            reasons={summary?.health?.reasons}
          />
        ) : null}

        {step === 1 ? metaFields : null}

        {step === 2 ? resourceFields : null}

        {step === 3 ? (
          <div className="section-stack">
            <div className="rounded-[var(--radius-lg)] border border-border/50 bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-subheading">Store readiness</p>
                <StatusBadge status={summary?.health?.status ?? "NOT_READY"} />
              </div>
              <ReadinessList
                readiness={readiness}
                reasons={summary?.health?.reasons}
              />
            </div>
            {metaFields}
            {resourceFields}
            {canManage ? (
              <Button type="button" onClick={onSave} disabled={saveMutation.isPending}>
                <Save className="size-3.5" aria-hidden />
                {saveMutation.isPending ? "Saving…" : returnTo ? "Save & Configure" : "Save configuration"}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1) as WizardStepIndex)}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((value) => Math.min(3, value + 1) as WizardStepIndex)}
            >
              Continue
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export function AdvertisingConfigurationPage() {
  return (
    <RequireActiveStore
      emptyTitle="No configuration"
      emptyDescription="Connect a store under Commerce, then configure Meta advertising here."
    >
      <Suspense fallback={<PageLoading cards={2} />}>
        <AdvertisingConfigurationHost />
      </Suspense>
    </RequireActiveStore>
  );
}

/** Remount form state when the active store changes to prevent cross-store field leakage. */
function AdvertisingConfigurationHost() {
  const { activeStore } = useActiveStore();
  return <AdvertisingConfigurationForm key={activeStore!.id} />;
}
