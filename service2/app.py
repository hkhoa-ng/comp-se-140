from flask import Flask, jsonify
import os
import subprocess

app = Flask(__name__)


def get_container_info():
    ip = os.popen("hostname -I").read().strip()
    processes = subprocess.getoutput("ps -ax")
    disk_space = subprocess.getoutput("df")
    uptime = subprocess.getoutput("uptime -p")

    return {
        "IP Address": ip,
        "Processes": processes,
        "Disk Space": disk_space,
        "Uptime": uptime,
    }


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "Service 2 Info": get_container_info(),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
