const { execSync } = require("child_process");
const axios = require("axios");
const crypto = require("crypto");

// Using dockerode to interact with Docker API
const Docker = require("dockerode");
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Centralized configuration
const CONFIG = {
  REDIS_KEYS: {
    STATE: "state",
    RUN_LOG: "run_log",
    SECRET_KEY: "secret_key",
  },
  VALID_STATES: ["INIT", "RUNNING", "PAUSED", "SHUTDOWN"],
};

// Function to get container info
function getContainerInfo() {
  const ip = execSync("hostname -I").toString().trim();
  const processes = execSync("ps -ax").toString();
  const diskSpace = execSync("df").toString();
  const uptime = execSync("uptime -p").toString();

  return {
    "IP Address": ip,
    Processes: processes,
    "Disk Space": diskSpace,
    Uptime: uptime,
  };
}

// Function to get service2 info
async function getService2Info() {
  return await axios
    .get("http://service2:5000/")
    .then((res) => res.data)
    .catch((err) => err.message);
}

function delay(ms) {
  console.log(`Service 1 is sleeping for ${ms / 1000} seconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shutdownAllContainers() {
  docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
      docker.getContainer(containerInfo.Id).stop(() => {
        console.log(`Successfully stopped all containers!`);
      });
    });
  });
}

const Redis = require("ioredis");

// Redis connection
const redis = new Redis({
  host: "redis",
  port: 6379,
});

async function stateCheckMiddleware(_, res, next) {
  res.setHeader("Content-Type", "text/plain");
  try {
    const currentState = await redis.get(CONFIG.REDIS_KEYS.STATE);

    if (currentState === "PAUSED") {
      return res.status(503).send("Service is paused globally.");
    }
    next();
  } catch (error) {
    console.error("Redis state check failed", error);
    res.status(500).send("Internal state check error");
  }
}

function initRedisSetup() {
  redis.set(CONFIG.REDIS_KEYS.STATE, "INIT");
  // See if there are any logs from previous runs
  redis.exists(CONFIG.REDIS_KEYS.RUN_LOG, (err, exists) => {
    if (err) {
      console.error("Error checking if RUN_LOG key exists in Redis:", err);
      // Delete the key if it exists
    } else if (exists) {
      redis.del(CONFIG.REDIS_KEYS.RUN_LOG);
    }
  });
  // Generate a new secret key
  redis.set(CONFIG.REDIS_KEYS.SECRET_KEY, generateSecretKey());
}

function generateSecretKey() {
  return crypto.randomBytes(64).toString("hex");
}

module.exports = {
  getContainerInfo,
  getService2Info,
  delay,
  shutdownAllContainers,
  stateCheckMiddleware,
  generateSecretKey,
  initRedisSetup,
  CONFIG,
  redis,
};
