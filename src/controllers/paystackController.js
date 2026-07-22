import { authMiddleware } from "../modules/auth/auth.validation.middleware.js";
import axios from "axios";
import express from "express";

const router = express.Router();

// export async function initialiePaystack(req, res, next) {
//   try {
//     const {
//       providerId,
//       serviceName,
//       totalAmount,
//       customerName,
//       customerEmail,
//       paymentMethod,
//       mobileNetwork,
//     } = req.body;

//     const amount = totalAmount * 100; // Convert to pesewas

//     // Initialize transaction with Paystack
//     const response = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       {
//         email: customerEmail || req.user.email,
//         amount: amount,
//         currency: "GHS",
//         reference: `${req.user.id}_${Date.now()}`,
//         metadata: {
//           custom_fields: [
//             {
//               display_name: "Provider ID",
//               variable_name: "provider_id",
//               value: providerId,
//             },
//             {
//               display_name: "Service Name",
//               variable_name: "service_name",
//               value: serviceName,
//             },
//             {
//               display_name: "Payment Method",
//               variable_name: "payment_method",
//               value: paymentMethod,
//             },
//             {
//               display_name: "Mobile Network",
//               variable_name: "mobile_network",
//               value: mobileNetwork || "N/A",
//             },
//           ],
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     if (response.data.status) {
//       return res.status(200).json({
//         success: true,
//         message: "Payment initialized successfully",
//         data: {
//           reference: response.data.data.reference,
//           authorization_url: response.data.data.authorization_url,
//         },
//       });
//     } else {
//       throw new Error(response.data.message || "Payment initialization failed");
//     }
//   } catch (error) {
//     console.error("Error initializing Paystack payment:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.response?.data?.message || "Failed to initialize payment",
//     });
//   }
// }

export async function paystackVerify(req, res, next) {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.status) {
      return res.status(200).json({
        success: true,
        data: response.data.data,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to verify payment",
    });
  }
}

export async function paystackWebhook(req, res, next) {
  try {
    const event = req.body;
    const signature = req.headers["x-paystack-signature"];

    // Verify webhook signature
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    // Handle different events
    if (event.event === "charge.success") {
      const transactionData = event.data;

      // Update booking status in your database
      console.log("Successful payment:", transactionData);

      // Here you would update the booking status in your database
      // await Booking.findOneAndUpdate(
      //   { paymentReference: transactionData.reference },
      //   { paymentStatus: 'completed', paymentData: transactionData }
      // );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.sendStatus(500);
  }
}

export const initializePaystack = async (req, res) => {
  try {
    const {
      providerId,
      providerName,
      serviceId,
      serviceName,
      servicePrice,
      totalAmount,
      customerName,
      customerEmail,
      paymentMethod,
      mobileNetwork,
      date,
      time,
      address,
      city,
    } = req.body;

    // Get user email from request
    const email = customerEmail || req.user?.email || "customer@example.com";
    const amount = Math.round(totalAmount * 100); // Convert to pesewas

    // ✅ FIX: Get the secret key from environment
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "❌ PAYSTACK_SECRET_KEY is not set in environment variables",
      );
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured",
      });
    }

    console.log("💰 Initializing Paystack payment:", {
      email,
      amount,
      reference: `${req.user?.id || "user"}_${Date.now()}`,
      secretKey: secretKey.substring(0, 10) + "...", // Log only first 10 chars for security
    });

    // ✅ FIX: Use the secret key with Bearer token
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email,
        amount: amount,
        currency: "GHS",
        reference: `${req.user?.id || "user"}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-callback`,
        metadata: {
          custom_fields: [
            {
              display_name: "Provider ID",
              variable_name: "provider_id",
              value: providerId || "N/A",
            },
            {
              display_name: "Provider Name",
              variable_name: "provider_name",
              value: providerName || "N/A",
            },
            {
              display_name: "Service Name",
              variable_name: "service_name",
              value: serviceName || "N/A",
            },
            {
              display_name: "Payment Method",
              variable_name: "payment_method",
              value: paymentMethod || "mobile-money",
            },
            {
              display_name: "Mobile Network",
              variable_name: "mobile_network",
              value: mobileNetwork || "N/A",
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`, // ✅ FIX: Use the secret key directly
          "Content-Type": "application/json",
        },
      },
    );

    console.log("📦 Paystack response:", {
      status: response.data.status,
      message: response.data.message,
    });

    if (response.data.status) {
      return res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        data: {
          reference: response.data.data.reference,
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
        },
      });
    } else {
      throw new Error(response.data.message || "Payment initialization failed");
    }
  } catch (error) {
    console.error("❌ Error initializing Paystack payment:", error);
    console.error("❌ Error response data:", error.response?.data);

    // ✅ Better error handling
    let errorMessage = "Failed to initialize payment";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.meta?.message) {
      errorMessage = error.response.data.meta.message;
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

// Verify Paystack Payment
export const verifyPaystack = async (req, res) => {
  try {
    const { reference } = req.params;

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured",
      });
    }

    console.log("🔍 Verifying payment with reference:", reference);

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("📦 Verification response:", response.data);

    if (response.data.status) {
      return res.status(200).json({
        success: true,
        data: response.data.data,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("❌ Error verifying Paystack payment:", error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to verify payment",
    });
  }
};
