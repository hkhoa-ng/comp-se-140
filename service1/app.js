const express = require("express");
const { execSync } = require("child_process");
const axios = require("axios");

// Using dockerode to interact with Docker API
const Docker = require("dockerode");
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const app = express();

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
    docker.listContainers(function (err, containers) {
      containers.forEach(function (containerInfo) {
        docker.getContainer(containerInfo.Id).stop(() => {
          console.log(`Successfully stopped all containers!`);
        });
      });
    });
  } catch (error) {
    res.json({ message: `Failed to stop containers: ${error}` });
  }
});

// Expose the app on port 8199
app.listen(8199, function () {
  console.log("Service 1 is listening on port 8199!");
});
