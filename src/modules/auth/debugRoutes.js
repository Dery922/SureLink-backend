// backend/routes/debugRoutes.js

router.get("/debug/ip", (req, res) => {
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.ip;

  res.json({
    detected_ip: ip,
    headers: req.headers,
    remoteAddress: req.connection.remoteAddress,
    socketAddress: req.socket.remoteAddress,
  });
});
