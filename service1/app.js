const express = require("express");
const { execSync } = require("child_process");
const axios = require("axios");

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

// Route to get container info
app.get("/", async function (_, res) {
  res.json({
    "Service 1 Info": getContainerInfo(),
    "Service 2 Info": await getService2Info(),
  });
});

// Expose the app on port 8199
app.listen(8199, function () {
  console.log("Service 1 is listening on port 8199!");
});
