import { Badge } from "@/components/ui/badge";
import {
    CustomerManagementType,
    CustomerOrderSource,
    CustomerOrderStatus,
    CustomerOrderType,
} from "@/lib/api-customer-management";

export function getCustomerManagementText(isRtl: boolean) {
    return {
        title: isRtl ? "إدارة العملاء" : "Customer Management",
        subtitle: isRtl
            ? "عرض بيانات العملاء وسجل الطلبات دون تعديل"
            : "Read-only customer profiles and order history",
        dashboard: isRtl ? "لوحة العملاء" : "Customer Dashboard",
        customerInsights: isRtl ? "رؤى العملاء" : "Customer Insights",
        totalCustomers: isRtl ? "إجمالي العملاء" : "Total Customers",
        totalRegisteredCustomers: isRtl ? "إجمالي العملاء المسجلين" : "Total registered customers",
        activeCustomers: isRtl ? "العملاء النشطون" : "Active Customers",
        activeCustomersDescription: isRtl
            ? "عملاء لديهم نشاط خلال الفترة المحددة"
            : "Customers with activity during selected period",
        newCustomers: isRtl ? "عملاء جدد" : "New Customers",
        newCustomersDescription: isRtl
            ? "عملاء تم إنشاؤهم خلال الفترة المحددة"
            : "Customers created during selected period",
        partnerCustomers: isRtl ? "عملاء الشركاء" : "Partner Customers",
        partnerCustomersDescription: isRtl
            ? "عملاء مرتبطون بشركاء التوصيل"
            : "Customers associated with delivery partners",
        totalOrdersDescription: isRtl
            ? "إجمالي طلبات العملاء المعروضين"
            : "Total orders placed by displayed customers",
        averageOrdersPerCustomer: isRtl ? "متوسط الطلبات لكل عميل" : "Average Orders Per Customer",
        averageOrdersDescription: isRtl
            ? "إجمالي الطلبات مقسوماً على العملاء المعروضين"
            : "Total orders divided by displayed customers",
        topCustomers: isRtl ? "أفضل العملاء" : "Top Customers",
        customerTypesBreakdown: isRtl ? "توزيع أنواع العملاء" : "Customer Types Breakdown",
        activityBreakdown: isRtl ? "توزيع النشاط" : "Activity Breakdown",
        directCustomers: isRtl ? "عملاء مباشرون" : "Direct Customers",
        activeToday: isRtl ? "نشط اليوم" : "Active Today",
        activeThisMonth: isRtl ? "نشط هذا الشهر" : "Active This Month",
        inactive30Days: isRtl ? "غير نشط +30 يوم" : "Inactive 30+ Days",
        inactive90Days: isRtl ? "غير نشط +90 يوم" : "Inactive 90+ Days",
        noCustomerActivity: isRtl ? "لا يوجد نشاط عملاء" : "No customer activity",
        branch: isRtl ? "الفرع" : "Branch",
        allBranches: isRtl ? "كل الفروع" : "All Branches",
        tableView: isRtl ? "عرض الجدول" : "Table View",
        cardView: isRtl ? "عرض البطاقات" : "Card View",
        filters: isRtl ? "التصفية" : "Filters",
        name: isRtl ? "اسم العميل" : "Customer Name",
        phone: isRtl ? "رقم الهاتف" : "Phone Number",
        email: isRtl ? "البريد الإلكتروني" : "Email",
        partner: isRtl ? "الشريك" : "Partner",
        customerType: isRtl ? "نوع العميل" : "Customer Type",
        status: isRtl ? "الحالة" : "Status",
        dateFrom: isRtl ? "نشاط الطلبات من" : "Order activity from",
        dateTo: isRtl ? "نشاط الطلبات إلى" : "Order activity to",
        all: isRtl ? "الكل" : "All",
        direct: isRtl ? "مباشر" : "Direct",
        partnerCustomer: isRtl ? "عميل شريك" : "Partner",
        active: isRtl ? "نشط" : "Active",
        inactive: isRtl ? "غير نشط" : "Inactive",
        apply: isRtl ? "تطبيق" : "Apply",
        reset: isRtl ? "إعادة ضبط" : "Reset",
        refresh: isRtl ? "تحديث" : "Refresh",
        totalOrders: isRtl ? "إجمالي الطلبات" : "Total Orders",
        lastOrderDate: isRtl ? "تاريخ آخر طلب" : "Last Order Date",
        actions: isRtl ? "الإجراءات" : "Actions",
        viewDetails: isRtl ? "عرض التفاصيل" : "View Details",
        loading: isRtl ? "جارٍ تحميل العملاء..." : "Loading customers...",
        empty: isRtl ? "لا يوجد عملاء مطابقون." : "No customers match these filters.",
        emptyTitle: isRtl ? "لا يوجد عملاء" : "No customers found",
        emptyDescription: isRtl ? "جرّب تعديل عوامل التصفية" : "Try adjusting your filters",
        loadError: isRtl ? "تعذر تحميل العملاء." : "Could not load customers.",
        invalidDateRange: isRtl
            ? "يجب ألا يكون تاريخ البداية بعد تاريخ النهاية."
            : "Date from cannot be after date to.",
        details: isRtl ? "تفاصيل العميل" : "Customer Details",
        generalInformation: isRtl ? "المعلومات العامة" : "General Information",
        customerSummary: isRtl ? "ملخص العميل" : "Customer Summary",
        customerSince: isRtl ? "عميل منذ" : "Customer Since",
        orderActivity: isRtl ? "نشاط الطلبات" : "Order Activity",
        mostActiveMonth: isRtl ? "الشهر الأكثر نشاطاً" : "Most Active Month",
        orderStatistics: isRtl ? "إحصائيات الطلبات" : "Order Statistics",
        partnerInformation: isRtl ? "معلومات الشريك" : "Partner Information",
        recentOrders: isRtl ? "الطلبات الأخيرة" : "Recent Orders",
        birthDate: isRtl ? "تاريخ الميلاد" : "Birth Date",
        createdAt: isRtl ? "تاريخ الإنشاء" : "Created At",
        completedOrders: isRtl ? "الطلبات المكتملة" : "Completed Orders",
        cancelledOrders: isRtl ? "الطلبات الملغاة" : "Cancelled Orders",
        totalSpend: isRtl ? "إجمالي الإنفاق" : "Total Spend",
        averageOrderValue: isRtl ? "متوسط قيمة الطلب" : "Average Order Value",
        firstOrderDate: isRtl ? "أول طلب" : "First Order",
        partnerCode: isRtl ? "كود الشريك" : "Partner Code",
        lastPartnerOrder: isRtl ? "آخر طلب عبر الشريك" : "Last Partner Order",
        orderNumber: isRtl ? "رقم الطلب" : "Order Number",
        orderDate: isRtl ? "تاريخ الطلب" : "Order Date",
        orderType: isRtl ? "نوع الطلب" : "Order Type",
        orderSource: isRtl ? "مصدر الطلب" : "Order Source",
        items: isRtl ? "العناصر" : "Items",
        total: isRtl ? "الإجمالي" : "Total",
        noOrders: isRtl ? "لا توجد طلبات مرتبطة بهذا العميل." : "No orders are linked to this customer.",
        detailError: isRtl ? "تعذر تحميل تفاصيل العميل." : "Could not load customer details.",
        retry: isRtl ? "إعادة المحاولة" : "Retry",
        notAvailable: "-",
    };
}

export function formatCustomerDate(value: string | null | undefined, isRtl: boolean) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(isRtl ? "ar-QA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export function formatCustomerMonth(value: string | null | undefined, isRtl: boolean) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(isRtl ? "ar-QA" : "en-GB", {
        month: "long",
        year: "numeric",
    }).format(new Date(value));
}

export function customerTypeLabel(type: CustomerManagementType, isRtl: boolean) {
    return type === CustomerManagementType.Partner
        ? (isRtl ? "عميل شريك" : "Partner")
        : (isRtl ? "مباشر" : "Direct");
}

export function orderStatusLabel(status: CustomerOrderStatus, isRtl: boolean) {
    const labels: Record<CustomerOrderStatus, [string, string]> = {
        [CustomerOrderStatus.New]: ["New", "جديد"],
        [CustomerOrderStatus.Preparing]: ["Preparing", "قيد التحضير"],
        [CustomerOrderStatus.Ready]: ["Ready", "جاهز"],
        [CustomerOrderStatus.Served]: ["Served", "تم التقديم"],
        [CustomerOrderStatus.Paid]: ["Paid", "مدفوع"],
        [CustomerOrderStatus.Cancelled]: ["Cancelled", "ملغى"],
        [CustomerOrderStatus.Completed]: ["Completed", "مكتمل"],
    };
    return labels[status]?.[isRtl ? 1 : 0] ?? String(status);
}

export function orderTypeLabel(type: CustomerOrderType, isRtl: boolean) {
    const labels: Record<CustomerOrderType, [string, string]> = {
        [CustomerOrderType.DineIn]: ["In-store", "داخل المتجر"],
        [CustomerOrderType.Takeaway]: ["Takeaway", "استلام"],
        [CustomerOrderType.Delivery]: ["Delivery", "توصيل"],
    };
    return labels[type]?.[isRtl ? 1 : 0] ?? String(type);
}

export function orderSourceLabel(source: CustomerOrderSource, isRtl: boolean) {
    const labels: Record<CustomerOrderSource, [string, string]> = {
        [CustomerOrderSource.Pos]: ["POS", "نقطة البيع"],
        [CustomerOrderSource.Talabat]: ["Talabat", "طلبات"],
        [CustomerOrderSource.DeliveryPartner]: ["Delivery partner", "شريك توصيل"],
        [CustomerOrderSource.Mobile]: ["Mobile", "تطبيق الجوال"],
    };
    return labels[source]?.[isRtl ? 1 : 0] ?? String(source);
}

export function CustomerActiveBadge({ active, isRtl }: { active: boolean; isRtl: boolean }) {
    return (
        <Badge variant={active ? "default" : "secondary"}>
            {active ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}
        </Badge>
    );
}

export function CustomerTypeBadge({ type, isRtl }: { type: CustomerManagementType; isRtl: boolean }) {
    return (
        <Badge variant={type === CustomerManagementType.Partner ? "outline" : "secondary"}>
            {customerTypeLabel(type, isRtl)}
        </Badge>
    );
}
