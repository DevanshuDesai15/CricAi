"""
Downloads Cricsheet data:
  - people.csv: canonical player registry
  - ipl ZIP: IPL matches (CSV2 format)
  - bbl ZIP: Big Bash League matches

Usage: python download_cricsheet.py
Output: ../data/people.csv, ../data/ipl/, ../data/bbl/
"""
import os
import zipfile
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

DOWNLOADS = {
    "people.csv": "https://cricsheet.org/register/people.csv",
    "ipl.zip":    "https://cricsheet.org/downloads/ipl_male_csv2.zip",
    "bbl.zip":    "https://cricsheet.org/downloads/bbl_male_csv2.zip",
}

def download(url: str, dest: Path) -> None:
    print(f"Downloading {url} -> {dest}")
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

def extract_zip(zip_path: Path, extract_to: Path) -> None:
    extract_to.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_to)
    print(f"Extracted {zip_path.name} -> {extract_to}")

if __name__ == "__main__":
    for filename, url in DOWNLOADS.items():
        dest = DATA_DIR / filename
        if dest.exists():
            print(f"Skipping {filename} (already downloaded)")
            continue
        download(dest=dest, url=url)
        if filename.endswith(".zip"):
            extract_zip(dest, DATA_DIR / filename.replace(".zip", ""))
    print("Done. Files in:", DATA_DIR)
