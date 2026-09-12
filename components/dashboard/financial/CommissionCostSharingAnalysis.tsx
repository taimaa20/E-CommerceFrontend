"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Percent, Receipt, Users } from "lucide-react";
import { Card, KPI } from "@/components/dashboard/primitives";
import { formatRestaurantDateTime } from "@/lib/date-time";
import type {
    CommissionAnalysis,
    CommissionOrder,
    PartnerCommission,
    PaymentProviderCommission,
} from "@/lib/dashboard/snapshot-types";

interface Props {
    analysis: CommissionAnalysis | null;
    loading: boolean;
    error: string | null;
    ar: boolean;
    periodLabel: string;
    currency: string;
    locale: string;
    timeZone: string;
    formatCurrency: (value: number) => string;
}

export function CommissionCostSharingAnalysis({
    analysis,
    loading,
    error,
    ar,
    periodLabel,
    locale,
    timeZone,
    formatCurrency,
}: Props) {
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const partners = analysis?.partners ?? [];
    const providers = analysis?.paymentProviders ?? [];
    const summary = analysis?.summary;
    const hasData = partners.length > 0 || providers.length > 0;
    const text = ar ? AR_TEXT : EN_TEXT;
    const fmtPct = (value: number) => `${value.toFixed(2)}%`;
    const formatDate = (value: string) => formatRestaurantDateTime(value, timeZone, locale);

    const toggle = (key: string) => setExpanded((current) => ({
        ...current,
        [key]: !current[key],
    }));

    return (
        <details className="dashboard-section" open>
            <summary className="dashboard-section-summary">
                <span className="dashboard-section-title">{text.title}</span>
                <span className="dashboard-section-meta">{periodLabel}</span>
            </summary>
            <div className="dashboard-section-body">
                {error && !analysis && (
                    <div className="dashboard-error-strip">
                        {text.loadError}
                    </div>
                )}

                {loading && !analysis && (
                    <div className="dashboard-empty-strip">
                        {text.loading}
                    </div>
                )}

                {!loading && !hasData && (
                    <div className="dashboard-empty-strip">
                        {text.noData}
                    </div>
                )}

                {hasData && summary && (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            <span className="muted" style={{ fontSize: 12 }}>
                                {text.infoOnly}
                            </span>
                        </div>

                        {analysis?.coverage
                            && (analysis.coverage.reconstructed > 0 || analysis.coverage.excluded > 0) && (
                            <div className="muted" style={{ fontSize: 12, marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                                <span>{text.coverageAnalyzed}: <b>{analysis.coverage.analyzed}</b></span>
                                <span>{text.coverageSnapshot}: <b>{analysis.coverage.fromSnapshot}</b></span>
                                <span>{text.coverageReconstructed}: <b>{analysis.coverage.reconstructed}</b></span>
                                {analysis.coverage.excluded > 0 && (
                                    <span>{text.coverageExcluded}: <b>{analysis.coverage.excluded}</b></span>
                                )}
                            </div>
                        )}

                        <div className="dashboard-auto-grid dashboard-kpi-grid">
                            <KPI label={text.totalPartnerCommission} icon={Users}
                                 value={formatCurrency(summary.totalPartnerCommission)}
                                 loading={loading && !analysis} />
                            <KPI label={text.totalPaymentFees} icon={Receipt}
                                 value={formatCurrency(summary.totalPaymentFees)}
                                 loading={loading && !analysis} />
                            <KPI label={text.restaurantCostSharing} icon={Receipt}
                                 value={formatCurrency(summary.totalRestaurantCostSharing)}
                                 loading={loading && !analysis} />
                            <KPI label={text.providerCostSharing} icon={Users}
                                 value={formatCurrency(summary.totalProviderCostSharing)}
                                 loading={loading && !analysis} />
                            <KPI label={text.totalTransactions} icon={Receipt}
                                 value={summary.totalCommissionTransactions}
                                 loading={loading && !analysis} />
                            <KPI label={text.averageCommissionPercent} icon={Percent}
                                 value={fmtPct(summary.averageCommissionPercentage)}
                                 loading={loading && !analysis} />
                            <KPI label={text.averageFeePerOrder} icon={Receipt}
                                 value={formatCurrency(summary.averageFeePerOrder)}
                                 loading={loading && !analysis} />
                        </div>

                        <div className="dashboard-auto-grid dashboard-detail-grid" style={{ marginTop: 14 }}>
                            {partners.length > 0 && (
                                <Card title={text.partnerList} subtitle={periodLabel}>
                                    <PartnerCommissionTable
                                        rows={partners}
                                        expanded={expanded}
                                        ar={ar}
                                        text={text}
                                        formatCurrency={formatCurrency}
                                        formatDate={formatDate}
                                        formatPercent={fmtPct}
                                        onToggle={toggle}
                                    />
                                </Card>
                            )}

                            {providers.length > 0 && (
                                <Card title={text.paymentProviderList} subtitle={periodLabel}>
                                    <PaymentProviderCommissionTable
                                        rows={providers}
                                        expanded={expanded}
                                        ar={ar}
                                        text={text}
                                        formatCurrency={formatCurrency}
                                        formatDate={formatDate}
                                        formatPercent={fmtPct}
                                        onToggle={toggle}
                                    />
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </details>
    );
}

function PartnerCommissionTable({
    rows,
    expanded,
    ar,
    text,
    formatCurrency,
    formatDate,
    formatPercent,
    onToggle,
}: {
    rows: PartnerCommission[];
    expanded: Record<string, boolean>;
    ar: boolean;
    text: typeof EN_TEXT;
    formatCurrency: (value: number) => string;
    formatDate: (value: string) => string;
    formatPercent: (value: number) => string;
    onToggle: (key: string) => void;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{text.partner}</th>
                        <th>{text.orders}</th>
                        <th>{text.grossSales}</th>
                        <th>{text.commissionPercent}</th>
                        <th>{text.commissionAmount}</th>
                        <th>{text.restaurantShare}</th>
                        <th>{text.partnerShare}</th>
                        <th>{text.restaurantFinalRevenue}</th>
                        <th>{text.averageCommissionPerOrder}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const key = `partner:${row.key}`;
                        const open = expanded[key];
                        return (
                            <React.Fragment key={key}>
                                <tr>
                                    <td className="bold">
                                        <button type="button" className="btn btn-ghost" onClick={() => onToggle(key)}>
                                            {open ? <ChevronDown /> : <ChevronRight />}
                                            {ar ? (row.partnerAr || row.partner) : row.partner}
                                        </button>
                                    </td>
                                    <td className="num">{row.numberOfOrders}</td>
                                    <td className="num">{formatCurrency(row.grossSales)}</td>
                                    <td className="num">{formatPercent(row.commissionPercentage)}</td>
                                    <td className="num">{formatCurrency(row.commissionAmount)}</td>
                                    <td className="num">{formatCurrency(row.restaurantShare)}</td>
                                    <td className="num">{formatCurrency(row.partnerShare)}</td>
                                    <td className="num bold">{formatCurrency(row.restaurantFinalRevenue)}</td>
                                    <td className="num">{formatCurrency(row.averageCommissionPerOrder)}</td>
                                </tr>
                                {open && (
                                    <tr>
                                        <td colSpan={9}>
                                            <CommissionOrdersTable
                                                rows={row.orders}
                                                text={text}
                                                formatCurrency={formatCurrency}
                                                formatDate={formatDate}
                                                formatPercent={formatPercent}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function PaymentProviderCommissionTable({
    rows,
    expanded,
    ar,
    text,
    formatCurrency,
    formatDate,
    formatPercent,
    onToggle,
}: {
    rows: PaymentProviderCommission[];
    expanded: Record<string, boolean>;
    ar: boolean;
    text: typeof EN_TEXT;
    formatCurrency: (value: number) => string;
    formatDate: (value: string) => string;
    formatPercent: (value: number) => string;
    onToggle: (key: string) => void;
}) {
    return (
        <div className="tbl-scroll">
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{text.paymentMethod}</th>
                        <th>{text.transactions}</th>
                        <th>{text.grossAmount}</th>
                        <th>{text.feePercent}</th>
                        <th>{text.feeAmount}</th>
                        <th>{text.restaurantShare}</th>
                        <th>{text.providerShare}</th>
                        <th>{text.netAmountReceived}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const key = `provider:${row.key}`;
                        const open = expanded[key];
                        return (
                            <React.Fragment key={key}>
                                <tr>
                                    <td className="bold">
                                        <button type="button" className="btn btn-ghost" onClick={() => onToggle(key)}>
                                            {open ? <ChevronDown /> : <ChevronRight />}
                                            {ar ? (row.paymentMethodAr || row.paymentMethod) : row.paymentMethod}
                                        </button>
                                    </td>
                                    <td className="num">{row.transactions}</td>
                                    <td className="num">{formatCurrency(row.grossAmount)}</td>
                                    <td className="num">{formatPercent(row.feePercentage)}</td>
                                    <td className="num">{formatCurrency(row.feeAmount)}</td>
                                    <td className="num">{formatCurrency(row.restaurantShare)}</td>
                                    <td className="num">{formatCurrency(row.providerShare)}</td>
                                    <td className="num bold">{formatCurrency(row.netAmountReceived)}</td>
                                </tr>
                                {open && (
                                    <tr>
                                        <td colSpan={8}>
                                            <CommissionOrdersTable
                                                rows={row.orders}
                                                text={text}
                                                formatCurrency={formatCurrency}
                                                formatDate={formatDate}
                                                formatPercent={formatPercent}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CommissionOrdersTable({
    rows,
    text,
    formatCurrency,
    formatDate,
    formatPercent,
}: {
    rows: CommissionOrder[];
    text: typeof EN_TEXT;
    formatCurrency: (value: number) => string;
    formatDate: (value: string) => string;
    formatPercent: (value: number) => string;
}) {
    return (
        <div className="tbl-scroll" style={{ margin: "8px 0" }}>
            <table className="tbl">
                <thead>
                    <tr>
                        <th>{text.orderNumber}</th>
                        <th>{text.date}</th>
                        <th>{text.customer}</th>
                        <th>{text.orderTotal}</th>
                        <th>{text.commissionPercent}</th>
                        <th>{text.commissionAmount}</th>
                        <th>{text.restaurantShare}</th>
                        <th>{text.providerShare}</th>
                        <th>{text.netAmount}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((order) => (
                        <tr key={`${order.orderId}:${order.commissionAmount}:${order.netAmount}`}>
                            <td className="bold">{order.orderNumber}</td>
                            <td>{formatDate(order.dateUtc)}</td>
                            <td>{order.customer}</td>
                            <td className="num">{formatCurrency(order.orderTotal)}</td>
                            <td className="num">{formatPercent(order.commissionPercentage)}</td>
                            <td className="num">{formatCurrency(order.commissionAmount)}</td>
                            <td className="num">{formatCurrency(order.restaurantShare)}</td>
                            <td className="num">{formatCurrency(order.providerShare)}</td>
                            <td className="num bold">{formatCurrency(order.netAmount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const EN_TEXT = {
    title: "Commission & Cost Sharing Analysis",
    loading: "Loading commission analysis...",
    loadError: "Commission analysis could not load. Refresh the dashboard and try again.",
    noData: "No commission-based transactions found.",
    infoOnly: "Informational only. Existing revenue, profit, cost, margin, settlement, and export totals are unchanged.",
    coverageAnalyzed: "Transactions analyzed",
    coverageSnapshot: "From saved commission",
    coverageReconstructed: "Reconstructed from history",
    coverageExcluded: "Excluded (insufficient history)",
    totalPartnerCommission: "Total Partner Commission",
    totalPaymentFees: "Total Payment Fees",
    restaurantCostSharing: "Total Restaurant Cost Sharing",
    providerCostSharing: "Total Provider Cost Sharing",
    totalTransactions: "Total Commission Transactions",
    averageCommissionPercent: "Average Commission %",
    averageFeePerOrder: "Average Fee Per Order",
    partnerList: "Partner Commission List",
    paymentProviderList: "Payment Provider Commission List",
    partner: "Partner",
    orders: "Orders",
    grossSales: "Gross Sales",
    commissionPercent: "Commission %",
    commissionAmount: "Commission Amount",
    restaurantShare: "Restaurant Share",
    partnerShare: "Partner Share",
    restaurantFinalRevenue: "Restaurant Final Revenue",
    averageCommissionPerOrder: "Average Commission per Order",
    paymentMethod: "Payment Method",
    transactions: "Transactions",
    grossAmount: "Gross Amount",
    feePercent: "Fee %",
    feeAmount: "Fee Amount",
    providerShare: "Provider Share",
    netAmountReceived: "Net Amount Received",
    orderNumber: "Order Number",
    date: "Date",
    customer: "Customer",
    orderTotal: "Order Total",
    netAmount: "Net Amount",
};

const AR_TEXT: typeof EN_TEXT = {
    title: "تحليل العمولات وتقاسم التكلفة",
    loading: "جار تحميل تحليل العمولات...",
    loadError: "تعذر تحميل تحليل العمولات. حدّث اللوحة ثم حاول مرة أخرى.",
    noData: "لم يتم العثور على معاملات قائمة على العمولات.",
    infoOnly: "للمعلومات فقط. لم تتغير أرقام الإيراد أو الربح أو التكلفة أو الهامش أو التسوية أو التصدير الحالية.",
    coverageAnalyzed: "المعاملات المُحللة",
    coverageSnapshot: "من العمولة المحفوظة",
    coverageReconstructed: "مُعاد بناؤها من السجل",
    coverageExcluded: "مستبعدة (سجل غير كافٍ)",
    totalPartnerCommission: "إجمالي عمولات الشركاء",
    totalPaymentFees: "إجمالي رسوم الدفع",
    restaurantCostSharing: "إجمالي ما يتحمله المطعم",
    providerCostSharing: "إجمالي ما يتحمله المزود",
    totalTransactions: "إجمالي معاملات العمولة",
    averageCommissionPercent: "متوسط نسبة العمولة",
    averageFeePerOrder: "متوسط الرسوم لكل طلب",
    partnerList: "قائمة عمولات الشركاء",
    paymentProviderList: "قائمة رسوم مزودي الدفع",
    partner: "الشريك",
    orders: "الطلبات",
    grossSales: "إجمالي المبيعات",
    commissionPercent: "نسبة العمولة",
    commissionAmount: "قيمة العمولة",
    restaurantShare: "حصة المطعم",
    partnerShare: "حصة الشريك",
    restaurantFinalRevenue: "إيراد المطعم النهائي",
    averageCommissionPerOrder: "متوسط العمولة لكل طلب",
    paymentMethod: "طريقة الدفع",
    transactions: "المعاملات",
    grossAmount: "إجمالي المبلغ",
    feePercent: "نسبة الرسوم",
    feeAmount: "قيمة الرسوم",
    providerShare: "حصة المزود",
    netAmountReceived: "الصافي المستلم",
    orderNumber: "رقم الطلب",
    date: "التاريخ",
    customer: "العميل",
    orderTotal: "إجمالي الطلب",
    netAmount: "الصافي",
};
