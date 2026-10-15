"""Cross-platform test environment helper for FlowState E2E and CDP tests.

Provides platform-aware detection for:
- Chrome executable path (macOS, Windows, Linux)
- FlowState extension directory
- Temporary scratch and user profile directories
"""

from __future__ import annotations

import os
import platform
import shutil
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXTENSION_DIR = str(REPO_ROOT / "extension")
SCRATCH_DIR = os.getenv("FLOWSTATE_SCRATCH_DIR") or str(Path(tempfile.gettempdir()) / "flowstate_test_scratch")
os.makedirs(SCRATCH_DIR, exist_ok=True)


def find_chrome() -> str:
    """Find the path to the Chrome/Chromium binary across platforms."""
    custom = os.getenv("CHROME_PATH")
    if custom and os.path.exists(custom):
        return custom

    system = platform.system()
    if system == "Darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
    elif system == "Windows":
        candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p

    for binary in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]:
        found = shutil.which(binary)
        if found:
            return found

    return "chrome"


CHROME_EXE = find_chrome()
