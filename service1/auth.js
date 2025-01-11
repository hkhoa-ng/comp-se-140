const jwt = require("jsonwebtoken");
// We use redis to store the secret key. When the service starts, it will create a unique key and store it in redis. This key will be used to sign the JWT tokens. When state is changed to INIT, a new key will be generated and stored in redis. This will invalidate all the previous tokens.
const { CONFIG, redis } = require("./utils");

// This is a bad practice, we should be using environment variables on production, but for the sake of simplicity we will use a hardcoded secret key
const USERNAME = "username";
const PASSWORD = "password";

// Middleware to authenticate user. It first check if a JWT token is presented. If not, it checks for username and password credentials. If the crendentials are correct, it generates a new JWT token and adds it to the response headers.
async function authenticateMiddleware(req, res, next) {
  const secretKey = await redis.get(CONFIG.REDIS_KEYS.SECRET_KEY);
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  // Verify the JWT token if it exists
  if (token) {
    return jwt.verify(token, secretKey, (err, user) => {
      if (err)
        return res
          .status(403)
          .json({ error: "Invalid token. Please login again!" });
      req.user = user;
      next();
    });
  }

  // Check for username and password credentials
  const credentials = authHeader?.startsWith("Basic ")
    ? authHeader.split(" ")[1]
    : null;
  if (!credentials)
    return res
      .status(401)
      .json({ error: "Unauthorized. Please provide credentials." });

  // Generate a new JWT token if the credentials are correct
  const [username, password] = Buffer.from(credentials, "base64")
    .toString()
    .split(":");
  if (username === USERNAME && password === PASSWORD) {
    const user = { username };
    const newToken = jwt.sign(user, secretKey, { expiresIn: "1h" }); // Token valid for 1 hour

    // Add token to response headers
    res.setHeader("Authorization", `Bearer ${newToken}`);
    req.user = user;
    return next();
  }

  // If the credentials are incorrect, return an error
  return res.status(401).json({
    error: "Invalid credentials for this action.",
  });
}

module.exports = { authenticateMiddleware };
