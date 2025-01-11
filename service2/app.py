"""
This module contains the Flask application and functions to retrieve container information.
"""

import os
import subprocess
from flask import Flask, jsonify

app = Flask(__name__)


def get_container_info():
    """
    Retrieve container information including IP address, running processes, disk space, and uptime.

    Returns:
        dict: A dictionary containing the container information.
    """
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


@app.route("/info")
def info():
    """
    Endpoint to get container information.

    Returns:
        Response: A Flask JSON response containing the container information.
    """
    return jsonify(get_container_info())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
