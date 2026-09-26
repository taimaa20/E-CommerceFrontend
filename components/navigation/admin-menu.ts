import type { LucideIcon } from "lucide-react";
import {
    Activity,
    BadgePercent,
    Ban,
    Banknote,
    BarChart3,
    Boxes,
    Building2,
    ClipboardList,
    Coins,
    CreditCard,
    FileText,
    Gift,
    Layers,
    LayoutDashboard,
    Laptop,
    MapPinned,
    Megaphone,
    MessageCircle,
    Package,
    Palette,
    Receipt,
    Settings,
    ShieldAlert,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Store,
    Tag,
    Trash2,
    Truck,
    Users,
    Wrench,
} from "lucide-react";
import { config } from "@/lib/config";
import type { TranslationKey } from "@/lib/translations";

export interface AdminMenuItem {
    icon: LucideIcon;
    label: string;
    href?: string;
    children?: AdminMenuItem[];
    external?: boolean;
}

interface AdminMenuArgs {
    ar: boolean;
    t: (key: TranslationKey) => string;
}

export function createAdminMenuItems({ ar, t }: AdminMenuArgs): AdminMenuItem[] {
    return [
        {
            icon: LayoutDashboard,
            label: ar ? "لوحات التحكم" : "Dashboard",
            children: [
                { icon: LayoutDashboard, label: ar ? "نظرة عامة" : "Overview", href: "/ntxadminpos/dashboard/home" },
            ],
        },
        {
            icon: Package,
            label: ar ? "الكتالوج" : "Catalog",
            children: [
                { icon: ShoppingBag, label: t("products"), href: "/ntxadminpos/products" },
                { icon: Layers, label: t("categories"), href: "/ntxadminpos/categories" },
                { icon: Gift, label: ar ? "العروض" : "Offers", href: "/ntxadminpos/offers" },
                { icon: Megaphone, label: ar ? "لافتات المتجر" : "Storefront Banners", href: "/ntxadminpos/banners" },
                { icon: Tag, label: ar ? "العلامات التجارية" : "Brands", href: "/ntxadminpos/brands" },
            ],
        },
        {
            icon: Receipt,
            label: ar ? "الطلبات والمبيعات" : "Orders & Sales",
            children: [
                { icon: Activity, label: ar ? "لوحة العمليات" : "Operations Dashboard", href: "/ntxadminpos/dashboard/operations" },
                { icon: Receipt, label: t("orders"), href: "/ntxadminpos/orders" },
                ...(config.deliveryPartnersEnabled
                    ? [{ icon: Truck, label: ar ? "شركاء التوصيل" : "Delivery Partners", href: "/ntxadminpos/delivery-partners" }]
                    : []),
                { icon: MapPinned, label: ar ? "مناطق التوصيل" : "Delivery Zones", href: "/ntxadminpos/delivery-zones" },
                { icon: Ban, label: ar ? "الطلبات الملغاة" : "Cancelled Orders", href: "/ntxadminpos/cancel-log" },
                { icon: ShieldAlert, label: ar ? "التصعيدات" : "Escalations", href: "/ntxadminpos/escalations" },
            ],
        },
        {
            icon: Banknote,
            label: ar ? "الكاشير" : "Cashier",
            children: [
                { icon: Banknote, label: ar ? "اللوحة المالية" : "Financial Dashboard", href: "/ntxadminpos/dashboard/financial" },
                { icon: Banknote, label: t("cashierBalance"), href: "/ntxadminpos/cashier-balance" },
                { icon: FileText, label: ar ? "فواتير المصروفات" : "Expense Invoices", href: "/ntxadminpos/expense-invoices" },
            ],
        },
        {
            icon: Users,
            label: ar ? "العملاء" : "Customers",
            children: [
                { icon: Users, label: ar ? "إدارة العملاء" : "Customer Management", href: "/ntxadminpos/customers" },
                { icon: BarChart3, label: ar ? "لوحة العملاء" : "Customer Dashboard", href: "/ntxadminpos/customers/dashboard" },
                { icon: BadgePercent, label: ar ? "فئات الخصم" : "Discount Groups", href: "/ntxadminpos/discount-groups" },
            ],
        },
        {
            icon: Sparkles,
            label: ar ? "التسويق والولاء" : "Marketing",
            children: [
                { icon: LayoutDashboard, label: ar ? "لوحة الولاء" : "Loyalty Dashboard", href: "/ntxadminpos/marketing/dashboard" },
                { icon: Settings, label: ar ? "إعدادات الولاء" : "Loyalty Settings", href: "/ntxadminpos/marketing/settings" },
                { icon: CreditCard, label: ar ? "المحافظ" : "Wallets", href: "/ntxadminpos/marketing/wallets" },
                { icon: ClipboardList, label: ar ? "قواعد الكسب" : "Earning Rules", href: "/ntxadminpos/marketing/rules" },
                { icon: BarChart3, label: ar ? "المستويات" : "Tiers", href: "/ntxadminpos/marketing/tiers" },
                { icon: Gift, label: ar ? "الحملات" : "Campaigns", href: "/ntxadminpos/marketing/campaigns" },
                { icon: Gift, label: ar ? "المكافآت" : "Rewards", href: "/ntxadminpos/marketing/rewards" },
                { icon: BadgePercent, label: ar ? "رموز الخصم" : "Promo Codes", href: "/ntxadminpos/marketing/promo-codes" },
                { icon: Users, label: ar ? "الشرائح" : "Segments", href: "/ntxadminpos/marketing/segments" },
                { icon: Users, label: ar ? "دمج العملاء" : "Customer Merge", href: "/ntxadminpos/marketing/merge" },
            ],
        },
        {
            icon: Package,
            label: t("inventoryManagement"),
            children: [
                { icon: Package, label: ar ? "لوحة المخزون والهدر" : "Inventory & Waste Dashboard", href: "/ntxadminpos/dashboard/inventory" },
                { icon: Package, label: ar ? "المخزون" : "Inventory", href: "/ntxadminpos/inventory" },
                { icon: Store, label: ar ? "نظرة عامة على المخزون" : "Stock Overview", href: "/ntxadminpos/retail" },
                { icon: Trash2, label: t("wasteLogPageTitle"), href: "/ntxadminpos/waste-log" },
            ],
        },
        {
            icon: Truck,
            label: ar ? "المشتريات والموردون" : "Purchasing & Suppliers",
            children: [
                { icon: ShoppingBag, label: ar ? "أوامر الشراء" : "Purchase Orders", href: "/ntxadminpos/procurement" },
                { icon: Truck, label: ar ? "الموردون" : "Suppliers", href: "/ntxadminpos/procurement?tab=suppliers" },
            ],
        },
        {
            icon: Boxes,
            label: ar ? "إدارة الأصول" : "Assets Management",
            children: [
                { icon: LayoutDashboard, label: ar ? "لوحة الأصول" : "Assets Dashboard", href: "/ntxadminpos/assets" },
                { icon: Boxes, label: ar ? "سجل الأصول" : "Assets List", href: "/ntxadminpos/assets/list" },
                { icon: ClipboardList, label: ar ? "فئات الأصول" : "Asset Categories", href: "/ntxadminpos/assets/categories" },
                { icon: Wrench, label: ar ? "الصيانة" : "Maintenance", href: "/ntxadminpos/assets/maintenance" },
                { icon: Activity, label: ar ? "سجل النشاط" : "Activity Logs", href: "/ntxadminpos/assets/logs" },
            ],
        },
        {
            icon: FileText,
            label: ar ? "التقارير" : "Reports",
            children: [
                { icon: FileText, label: ar ? "مركز التقارير" : "Report Center", href: "/ntxadminpos/reports" },
                { icon: Store, label: ar ? "ربحية المنتجات" : "Product Profitability", href: "/ntxadminpos/reports/retail" },
                { icon: Store, label: ar ? "مبيعات المنتجات (تفصيلي)" : "Product Sales (line level)", href: "/ntxadminpos/orders/retail-sales" },
            ],
        },
        {
            icon: Users,
            label: ar ? "الموظفون" : "Staff",
            children: [
                { icon: Users, label: ar ? "الموارد البشرية" : "HR", href: "/ntxadminpos/hr" },
                { icon: Gift, label: ar ? "المكافآت" : "Bonuses", href: "/ntxadminpos/hr/bonuses" },
                { icon: BarChart3, label: ar ? "تحليلات الموظفين" : "Staff Analytics", href: "/ntxadminpos/staff" },
            ],
        },
        {
            icon: ShieldCheck,
            label: ar ? "التدقيق والأمان" : "Audit & Security",
            children: [
                { icon: ShieldCheck, label: ar ? "لوحة التدقيق" : "Audit Dashboard", href: "/ntxadminpos/dashboard/audit" },
            ],
        },
        {
            icon: Settings,
            label: t("settings"),
            children: [
                { icon: Building2, label: ar ? "الفروع" : "Branches", href: "/ntxadminpos/branches" },
                { icon: Building2, label: ar ? "إعدادات الفروع" : "Branch Configuration", href: "/ntxadminpos/branch-configurations" },
                { icon: Settings, label: ar ? "إعدادات المتجر" : "Store Settings", href: "/ntxadminpos/settings" },
                { icon: CreditCard, label: ar ? "طرق الدفع" : "Payment Methods", href: "/ntxadminpos/payment-methods" },
                { icon: Coins, label: ar ? "العملات" : "Currencies", href: "/ntxadminpos/currencies" },
                { icon: MessageCircle, label: ar ? "واتساب" : "WhatsApp", href: "/ntxadminpos/whatsapp" },
                { icon: Palette, label: t("branding"), href: "/ntxadminpos/branding" },
            ],
        },
    ];
}

export function createPosMenuItems({ ar, t }: AdminMenuArgs): AdminMenuItem[] {
    return [
        {
            icon: Laptop,
            label: ar ? "شاشات نقاط البيع" : "POS Screens",
            children: [
                // /ntxtakeawaypos is the retail till. The URL keeps its legacy name — only
                // the label is retail. The dine-in and kitchen screens are restaurant-only
                // and are deliberately absent from the retail navigation; their routes still
                // exist and stay reachable by URL until the dead-code phase removes them.
                { icon: ShoppingCart, label: t("posScreen"), href: "/ntxtakeawaypos", external: true },
                { icon: Banknote, label: t("cashierScreen"), href: "/ntxcashierpos", external: true },
            ],
        },
    ];
}

// Read-only dashboard/analytics routes the Marketing role may view. Single
// source of truth — drives both the sidebar menu (createMarketingMenuItems)
// and the admin-layout route guard. Keep paths and menu items in sync.
export const MARKETING_ALLOWED_PREFIXES = [
    "/ntxadminpos/dashboard/home",
    "/ntxadminpos/dashboard/financial",
    "/ntxadminpos/dashboard/operations",
    "/ntxadminpos/customers/dashboard",
    "/ntxadminpos/customers",
    "/ntxadminpos/marketing/dashboard",
] as const;

export function isMarketingAllowedPath(pathname: string): boolean {
    return MARKETING_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
}

export function createMarketingMenuItems({ ar }: AdminMenuArgs): (AdminMenuItem & { href: string })[] {
    return [
        { icon: LayoutDashboard, label: ar ? "نظرة عامة" : "Overview", href: "/ntxadminpos/dashboard/home" },
        { icon: Banknote, label: ar ? "اللوحة المالية" : "Financial Dashboard", href: "/ntxadminpos/dashboard/financial" },
        { icon: Activity, label: ar ? "لوحة الطلبات" : "Orders Dashboard", href: "/ntxadminpos/dashboard/operations" },
        { icon: BarChart3, label: ar ? "لوحة العملاء" : "Customer Dashboard", href: "/ntxadminpos/customers/dashboard" },
        { icon: Users, label: ar ? "بطاقات العملاء" : "Customer Cards", href: "/ntxadminpos/customers" },
        { icon: Gift, label: ar ? "لوحة الولاء" : "Loyalty Dashboard", href: "/ntxadminpos/marketing/dashboard" },
    ];
}

export function createAdminRailItems(args: AdminMenuArgs): (AdminMenuItem & { href: string })[] {
    return createAdminMenuItems(args)
        .flatMap((group) => group.children?.slice(0, 1) ?? [group])
        .filter((item): item is AdminMenuItem & { href: string } => !!item.href)
        .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index);
}
