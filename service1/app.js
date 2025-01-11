const express = require("express");
const bodyParser = require("body-parser");
const {
  getContainerInfo,
  getService2Info,
  delay,
  shutdownAllContainers,
  CONFIG,
  stateCheckMiddleware,
  initRedisSetup,
  redis,
  generateSecretKey,
} = require("./utils");
const { authenticateMiddleware } = require("./auth");

// Initialize Redis connection
initRedisSetup();

// Express app
const app = express();
app.use(express.text());
app.use(bodyParser.json());

// Apply middleware to routes that should be pausable
app.use("/request", stateCheckMiddleware);
app.use("/api", stateCheckMiddleware);
app.use("/run-log", stateCheckMiddleware);

// Route to get container info
app.get("/api", async function (_, res) {
  res.json({
    "Service 1 Info": getContainerInfo(),
    "Service 2 Info": await getService2Info(),
  });

  // Sleep for 2 seconds
  await delay(2000);
});

// Route to stop all containers
app.get("/stop", (_, res) => {
  try {
    res.json({ message: "Stopping all containers..." });
    shutdownAllContainers();
  } catch (error) {
    res.json({ message: `Failed to stop containers: ${error}` });
  }
});

// Endpoints for the tests
// Route to get the state
app.get("/state", async (_, res) => {
  console.log("Getting state...");
  res.setHeader("Content-Type", "text/plain");
  try {
    const currentState = await redis.get(CONFIG.REDIS_KEYS.STATE);

    if (currentState === "PAUSED") {
      return res.status(503).send("Service is paused globally.");
    }
    res.send(currentState);
  } catch (error) {
    console.error("Redis state check failed", error);
    res.status(500).send("Redis internal state check error");
  }
});

// Set the state with PUT request. Using the authenticateMiddleware here for authentication
app.put("/state", authenticateMiddleware, async (req, res) => {
  const newState = req.body;

  if (!CONFIG.VALID_STATES.includes(newState)) {
    return res
      .status(400)
      .send(`Invalid state. Must be one of: ${CONFIG.VALID_STATES.join(", ")}`);
  }

  try {
    // Fetch the current state
    const currentState = await redis.get(CONFIG.REDIS_KEYS.STATE);
    // If the new state is the same as the current state, return early
    if (currentState === newState) {
      return res.send(`Global state set to ${newState}`);
    }
    // Update the state in redis, along with the timestamp in RUN_LOG
    await redis.set(CONFIG.REDIS_KEYS.STATE, newState);
    await redis.rpush(
      CONFIG.REDIS_KEYS.RUN_LOG,
      `${new Date().toISOString()} - ${currentState} -> ${newState}`
    );
    // In case of INIT, generate a new secret key
    if (newState === "INIT") {
      await redis.set(CONFIG.REDIS_KEYS.SECRET_KEY, generateSecretKey());
    }
    // In case of SHUTDOWN, stop all containers
    if (newState === "SHUTDOWN") {
      res.send("SHUTDOWN all containers...");
      shutdownAllContainers();
      return;
    }
    // Normal response
    res.send(`Global state set to ${newState}`);
  } catch (error) {
    console.error("Could not update global state: ", error);
    res.status(500).send("Could not update global state");
  }
});

// Get run log with GET request
app.get("/run-log", async (_, res) => {
  console.log("Getting run log...");
  res.setHeader("Content-Type", "text/plain");
  // Try getting the log from redis
  try {
    const runLog = await redis.lrange(CONFIG.REDIS_KEYS.RUN_LOG, 0, -1);
    if (!runLog) {
      return res.status(404).send("Run log not found");
    }
    res.send(runLog.join("\n"));
  } catch (error) {
    console.error("Could not get run log: ", error);
    res.status(500).send("Could not get run log");
  }
});

app.get("/request", async function (_, res) {
  console.log("Service 1 is processing a request...");
  res.setHeader("Content-Type", "text/plain");
  res.send(
    JSON.stringify({
      "Service 1 Info": getContainerInfo(),
      "Service 2 Info": await getService2Info(),
    })
  );

  // Sleep for 2 seconds
  await delay(2000);
});

// Expose the app on port 8199
app.listen(8199, function () {
  const DEBUG_MESSAGE = "fix SHUTDOWN";
  console.log("Service 1 is listening on port 8199!");
  console.log(
    "Writing this to debug if it's built differently: " + DEBUG_MESSAGE
  );
});
