import Admin from "../models/Admin.js";
import User from "../../models/User.js";
import { userProviderRepository } from "../repositories/userProviderRepository.js";
import { deliveryRepository } from "../repositories/deliveryRepository.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Role-specific stat builders
// ---------------------------------------------------------------------------

async function superAdminStats() {
  const [providerCounts, adminCount, activeDeliveries] = await Promise.all([
    userProviderRepository.countByStatus(),
    Admin.countDocuments({ status: "active" }),
    deliveryRepository.countByStatus(),
  ]);

  return [
    {
      id: "total-providers",
      label: "Total Providers",
      value: String(providerCounts.total),
      icon: "fa-solid fa-building",
      iconBg: "bg-[#E8F0FF]",
      iconColor: "text-[#0057FF]",
      trend: "",
      trendLabel: "registered on platform",
      trendUp: true,
    },
    {
      id: "admin-accounts",
      label: "Admin Accounts",
      value: String(adminCount),
      icon: "fa-solid fa-users-gear",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      trend: "",
      trendLabel: "active accounts",
      trendUp: true,
    },
    {
      id: "pending-reviews",
      label: "Pending Reviews",
      value: String(providerCounts.pending),
      icon: "fa-solid fa-hourglass-half",
      iconBg: "bg-orange-50",
      iconColor: "text-[#FF6B00]",
      trend: "",
      trendLabel: "awaiting approval",
      trendUp: false,
    },
    {
      id: "active-deliveries",
      label: "Active Deliveries",
      value: String(activeDeliveries.active),
      icon: "fa-solid fa-truck-fast",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "",
      trendLabel: "in transit now",
      trendUp: true,
    },
  ];
}

async function providerManagementStats() {
  const counts = await userProviderRepository.countByStatus();
  return [
    {
      id: "total-providers",
      label: "Total Providers",
      value: String(counts.total),
      icon: "fa-solid fa-building",
      iconBg: "bg-[#E8F0FF]",
      iconColor: "text-[#0057FF]",
      trend: "",
      trendLabel: "registered",
      trendUp: true,
    },
    {
      id: "active-providers",
      label: "Active",
      value: String(counts.active),
      icon: "fa-solid fa-circle-check",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      trend: "",
      trendLabel: "serving customers",
      trendUp: true,
    },
    {
      id: "pending-approval",
      label: "Pending Approval",
      value: String(counts.pending),
      icon: "fa-solid fa-clock",
      iconBg: "bg-orange-50",
      iconColor: "text-[#FF6B00]",
      trend: "",
      trendLabel: "awaiting review",
      trendUp: false,
    },
    {
      id: "suspended",
      label: "Suspended",
      value: String(counts.suspended),
      icon: "fa-solid fa-ban",
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      trend: "",
      trendLabel: "access revoked",
      trendUp: false,
    },
  ];
}

async function operationsStats() {
  const [counts, avgMins] = await Promise.all([
    deliveryRepository.countByStatus(),
    deliveryRepository.avgDeliveryMinutes(),
  ]);

  return [
    {
      id: "active-deliveries",
      label: "Active Deliveries",
      value: String(counts.active),
      icon: "fa-solid fa-truck-fast",
      iconBg: "bg-[#E8F0FF]",
      iconColor: "text-[#0057FF]",
      trend: "",
      trendLabel: "in transit now",
      trendUp: true,
    },
    {
      id: "completed-today",
      label: "Completed Today",
      value: String(counts.completedToday),
      icon: "fa-solid fa-circle-check",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      trend: "",
      trendLabel: "delivered today",
      trendUp: true,
    },
    {
      id: "delayed",
      label: "Delayed",
      value: String(counts.delayed),
      icon: "fa-solid fa-triangle-exclamation",
      iconBg: "bg-orange-50",
      iconColor: "text-[#FF6B00]",
      trend: "",
      trendLabel: "needs attention",
      trendUp: false,
    },
    {
      id: "avg-delivery",
      label: "Avg Delivery Time",
      value: avgMins ? `${avgMins} min` : "—",
      icon: "fa-solid fa-stopwatch",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      trend: "",
      trendLabel: "across completed",
      trendUp: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Role-specific activity builders
// ---------------------------------------------------------------------------

async function superAdminActivity() {
  const [recentProviders, recentAdmins] = await Promise.all([
    User.find({ roles: "provider" })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name email status createdAt")
      .lean(),
    Admin.find()
      .sort({ createdAt: -1 })
      .limit(2)
      .select("name email role createdAt")
      .lean(),
  ]);

  const items = [];

  for (const p of recentProviders) {
    const label = p.name?.full || p.email || "A provider";
    const statusIcon =
      p.status === "active"
        ? { icon: "fa-solid fa-circle-check", iconColor: "text-green-500" }
        : p.status === "suspended"
        ? { icon: "fa-solid fa-ban", iconColor: "text-red-400" }
        : { icon: "fa-solid fa-building-circle-check", iconColor: "text-[#0057FF]" };

    items.push({
      id: String(p._id),
      text: `Provider "${label}" registered`,
      time: p.createdAt,
      relativeTime: relativeTime(p.createdAt),
      ...statusIcon,
    });
  }

  for (const a of recentAdmins) {
    items.push({
      id: String(a._id),
      text: `Admin account "${a.name?.full || a.email}" created (${a.role.replace(/_/g, " ").toLowerCase()})`,
      time: a.createdAt,
      relativeTime: relativeTime(a.createdAt),
      icon: "fa-solid fa-user-plus",
      iconColor: "text-green-500",
    });
  }

  return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
}

async function providerManagementActivity() {
  const [pendingProviders, recentProviders] = await Promise.all([
    User.find({ roles: "provider", status: "verification_pending" })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name email createdAt")
      .lean(),
    User.find({ roles: "provider", status: { $ne: "verification_pending" } })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("name email status createdAt")
      .lean(),
  ]);

  const items = [];

  for (const p of pendingProviders) {
    items.push({
      id: String(p._id),
      text: `"${p.name?.full || p.email}" submitted for review`,
      time: p.createdAt,
      relativeTime: relativeTime(p.createdAt),
      icon: "fa-solid fa-file-arrow-up",
      iconColor: "text-[#0057FF]",
    });
  }

  for (const p of recentProviders) {
    const action = p.status === "active" ? "approved" : "updated";
    const iconColor = p.status === "active" ? "text-green-500" : "text-gray-400";
    items.push({
      id: String(p._id) + "-status",
      text: `Provider "${p.name?.full || p.email}" ${action}`,
      time: p.createdAt,
      relativeTime: relativeTime(p.createdAt),
      icon: p.status === "active" ? "fa-solid fa-circle-check" : "fa-solid fa-pen-to-square",
      iconColor,
    });
  }

  return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
}

async function operationsActivity() {
  const { deliveries } = await deliveryRepository.findAll({ limit: 5 });

  return deliveries.map((d) => {
    const isDelayed = d.status === "delayed";
    const isCompleted = d.status === "completed";
    return {
      id: String(d._id),
      text: isDelayed
        ? `Delivery ${d.reference} is delayed — needs attention`
        : isCompleted
        ? `Delivery ${d.reference} completed successfully`
        : `Delivery ${d.reference} is in transit`,
      time: d.started_at || d.createdAt,
      relativeTime: relativeTime(d.started_at || d.createdAt),
      icon: isDelayed
        ? "fa-solid fa-clock"
        : isCompleted
        ? "fa-solid fa-circle-check"
        : "fa-solid fa-truck-fast",
      iconColor: isDelayed
        ? "text-[#FF6B00]"
        : isCompleted
        ? "text-green-500"
        : "text-[#0057FF]",
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getDashboardSummary(role) {
  const [stats, activity] = await Promise.all([
    role === "SUPER_ADMIN"
      ? superAdminStats()
      : role === "PROVIDER_MANAGEMENT_ADMIN"
      ? providerManagementStats()
      : operationsStats(),
    role === "SUPER_ADMIN"
      ? superAdminActivity()
      : role === "PROVIDER_MANAGEMENT_ADMIN"
      ? providerManagementActivity()
      : operationsActivity(),
  ]);

  return { stats, activity };
}
