// backend/controllers/providerStatsController.js

import Booking from "../models/Booking.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// ==========================================
// GET PROVIDER STATISTICS
// GET /api/providers/:providerId/stats
// ==========================================
export const getProviderStats = async (req, res) => {
  try {
    const { providerId } = req.params;

    // Check if provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Get all bookings for this provider
    const bookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
    });

    // ===================== CALCULATE STATISTICS =====================
    const totalBookings = bookings.length;

    // Pending requests (pending + confirmed statuses)
    const pendingRequests = bookings.filter(
      (b) => b.status === "pending" || b.status === "confirmed",
    ).length;

    // Completed jobs
    const completedJobs = bookings.filter(
      (b) => b.status === "completed",
    ).length;

    // Cancelled jobs
    const cancelledJobs = bookings.filter(
      (b) => b.status === "cancelled",
    ).length;

    // In progress jobs
    const inProgressJobs = bookings.filter(
      (b) => b.status === "in_progress",
    ).length;

    // No show jobs
    const noShowJobs = bookings.filter((b) => b.status === "no_show").length;

    // Rescheduled jobs
    const rescheduledJobs = bookings.filter(
      (b) => b.status === "rescheduled",
    ).length;

    // Calculate average rating from bookings that have ratings
    const ratedBookings = bookings.filter(
      (b) => b.rating && b.rating.score && b.status === "completed",
    );

    let averageRating = 0;
    let totalRatings = ratedBookings.length;

    if (totalRatings > 0) {
      const sum = ratedBookings.reduce((acc, b) => acc + b.rating.score, 0);
      averageRating = parseFloat((sum / totalRatings).toFixed(1));
    }

    // Calculate total earnings (from completed and in-progress bookings)
    const totalEarnings = bookings
      .filter((b) => b.status === "completed" || b.status === "in_progress")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // ===================== STATUS BREAKDOWN =====================
    const statusBreakdown = {
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      in_progress: bookings.filter((b) => b.status === "in_progress").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      no_show: bookings.filter((b) => b.status === "no_show").length,
      rescheduled: bookings.filter((b) => b.status === "rescheduled").length,
    };

    // ===================== RECENT BOOKINGS =====================
    const recentBookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "serviceName status createdAt totalAmount customerName rating bookingDate bookingTime",
      );

    // ===================== MONTHLY STATS =====================
    const monthlyStats = await getMonthlyStats(providerId);

    // ===================== SERVICE BREAKDOWN =====================
    const serviceBreakdown = await getServiceBreakdown(providerId);

    // ===================== RESPONSE =====================
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBookings,
          pendingRequests,
          completedJobs,
          cancelledJobs,
          inProgressJobs,
          noShowJobs,
          rescheduledJobs,
          totalEarnings,
          averageRating,
          totalRatings,
        },
        statusBreakdown,
        recentBookings,
        monthlyStats,
        serviceBreakdown,
        provider: {
          id: provider._id,
          name:
            provider.business_profile?.businessName ||
            provider.name?.full ||
            `${provider.name?.first || ""} ${provider.name?.last || ""}`.trim() ||
            "Provider",
          avatar: provider.avatar?.url || provider.avatar || null,
          category: provider.provider_profile?.category || "General",
          trust: provider.trust || { average_rating: 0, total_ratings: 0 },
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching provider stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider statistics",
      error: error.message,
    });
  }
};

// ==========================================
// GET RATING DISTRIBUTION
// GET /api/providers/:providerId/ratings
// ==========================================
export const getRatingDistribution = async (req, res) => {
  try {
    const { providerId } = req.params;

    const bookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
      "rating.score": { $exists: true, $ne: null },
    });

    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    const ratings = [];

    bookings.forEach((booking) => {
      if (booking.rating && booking.rating.score) {
        const score = Math.round(booking.rating.score);
        if (distribution[score] !== undefined) {
          distribution[score] += 1;
        }
        ratings.push({
          score: booking.rating.score,
          comment: booking.rating.comment || "",
          ratedAt: booking.rating.ratedAt || booking.createdAt,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          bookingId: booking._id,
        });
      }
    });

    const total = ratings.length;
    const average =
      total > 0
        ? parseFloat(
            (ratings.reduce((sum, r) => sum + r.score, 0) / total).toFixed(1),
          )
        : 0;

    // Calculate percentages
    const percentages = Object.entries(distribution).reduce(
      (acc, [rating, count]) => {
        acc[rating] =
          total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
        return acc;
      },
      {},
    );

    res.status(200).json({
      success: true,
      data: {
        distribution,
        ratings: ratings
          .sort((a, b) => new Date(b.ratedAt) - new Date(a.ratedAt))
          .slice(0, 10),
        total,
        average,
        percentages,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching rating distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rating distribution",
      error: error.message,
    });
  }
};

// ==========================================
// GET PERFORMANCE METRICS
// GET /api/providers/:providerId/performance
// ==========================================
export const getPerformanceMetrics = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { period = "30" } = req.query;

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
      createdAt: { $gte: startDate },
    });

    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const pending = bookings.filter(
      (b) => b.status === "pending" || b.status === "confirmed",
    ).length;

    // Calculate completion rate
    const completionRate =
      total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;

    // Calculate average completion time (in hours)
    const completedBookings = bookings.filter(
      (b) => b.status === "completed" && b.completedAt && b.createdAt,
    );
    let averageCompletionTime = 0;
    if (completedBookings.length > 0) {
      const totalTime = completedBookings.reduce((sum, b) => {
        const completionTime = new Date(b.completedAt) - new Date(b.createdAt);
        return sum + completionTime;
      }, 0);
      averageCompletionTime = Math.round(
        totalTime / completedBookings.length / (1000 * 60 * 60),
      );
    }

    // Calculate revenue
    const revenue = bookings
      .filter((b) => b.status === "completed" || b.status === "in_progress")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Get average rating for the period
    const ratedBookings = bookings.filter((b) => b.rating && b.rating.score);
    const avgRating =
      ratedBookings.length > 0
        ? parseFloat(
            (
              ratedBookings.reduce((sum, b) => sum + b.rating.score, 0) /
              ratedBookings.length
            ).toFixed(1),
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        period: `${days} days`,
        totalBookings: total,
        completed,
        cancelled,
        pending,
        completionRate,
        averageCompletionTime:
          averageCompletionTime > 0 ? `${averageCompletionTime}h` : "N/A",
        revenue,
        averageRating: avgRating,
        totalRatings: ratedBookings.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching performance metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch performance metrics",
      error: error.message,
    });
  }
};

// ==========================================
// GET PROVIDER DASHBOARD
// GET /api/providers/me/dashboard
// ==========================================
export const getProviderDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Get all bookings
    const bookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
    });

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.bookingDate);
      return bookingDate >= today && bookingDate < tomorrow;
    });

    // Upcoming bookings (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.bookingDate);
      return (
        bookingDate >= today &&
        bookingDate < nextWeek &&
        (b.status === "pending" || b.status === "confirmed")
      );
    });

    // Quick stats
    const pendingRequests = bookings.filter(
      (b) => b.status === "pending" || b.status === "confirmed",
    ).length;
    const completedJobs = bookings.filter(
      (b) => b.status === "completed",
    ).length;

    // Average rating
    const ratedBookings = bookings.filter((b) => b.rating && b.rating.score);
    const averageRating =
      ratedBookings.length > 0
        ? parseFloat(
            (
              ratedBookings.reduce((sum, b) => sum + b.rating.score, 0) /
              ratedBookings.length
            ).toFixed(1),
          )
        : 0;

    // Recent bookings
    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((b) => ({
        id: b._id,
        serviceName: b.serviceName,
        customerName: b.customerName,
        status: b.status,
        totalAmount: b.totalAmount,
        bookingDate: b.bookingDate,
        bookingTime: b.bookingTime,
        createdAt: b.createdAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        today: {
          bookings: todaysBookings.length,
          revenue: todaysBookings
            .filter((b) => b.status === "completed")
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        },
        upcoming: upcomingBookings.length,
        pendingRequests,
        completedJobs,
        averageRating,
        totalRatings: ratedBookings.length,
        recentBookings,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

// ==========================================
// HELPER - GET MONTHLY STATS
// ==========================================
async function getMonthlyStats(providerId) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthBookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const completed = monthBookings.filter(
      (b) => b.status === "completed",
    ).length;
    const revenue = monthBookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    months.push({
      month: date.toLocaleString("default", { month: "short" }),
      year: date.getFullYear(),
      bookings: monthBookings.length,
      completed,
      revenue,
      pending: monthBookings.filter((b) => b.status === "pending").length,
      cancelled: monthBookings.filter((b) => b.status === "cancelled").length,
    });
  }

  return months;
}

// ==========================================
// HELPER - GET SERVICE BREAKDOWN
// ==========================================
async function getServiceBreakdown(providerId) {
  const bookings = await Booking.find({
    providerId: providerId,
    isDeleted: false,
    status: "completed",
  });

  const breakdown = {};

  bookings.forEach((booking) => {
    const serviceName = booking.serviceName || "Uncategorized";
    if (!breakdown[serviceName]) {
      breakdown[serviceName] = {
        count: 0,
        revenue: 0,
        totalRating: 0,
        ratingCount: 0,
      };
    }
    breakdown[serviceName].count += 1;
    breakdown[serviceName].revenue += booking.totalAmount || 0;
    if (booking.rating?.score) {
      breakdown[serviceName].totalRating += booking.rating.score;
      breakdown[serviceName].ratingCount += 1;
    }
  });

  // Convert to array, calculate average ratings, and sort by count
  return Object.entries(breakdown)
    .map(([service, data]) => ({
      service,
      count: data.count,
      revenue: data.revenue,
      avgRating:
        data.ratingCount > 0
          ? parseFloat((data.totalRating / data.ratingCount).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ==========================================
// GET PROVIDER SIMPLE STATS (for quick display)
// GET /api/providers/:providerId/simple-stats
// ==========================================
export const getProviderSimpleStats = async (req, res) => {
  try {
    const { providerId } = req.params;

    const bookings = await Booking.find({
      providerId: providerId,
      isDeleted: false,
    });

    const pendingRequests = bookings.filter(
      (b) => b.status === "pending" || b.status === "confirmed",
    ).length;

    const completedJobs = bookings.filter(
      (b) => b.status === "completed",
    ).length;

    // Average rating
    const ratedBookings = bookings.filter((b) => b.rating && b.rating.score);
    const averageRating =
      ratedBookings.length > 0
        ? parseFloat(
            (
              ratedBookings.reduce((sum, b) => sum + b.rating.score, 0) /
              ratedBookings.length
            ).toFixed(1),
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        pendingRequests,
        completedJobs,
        averageRating,
        totalRatings: ratedBookings.length,
        totalBookings: bookings.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching simple stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider statistics",
      error: error.message,
    });
  }
};
