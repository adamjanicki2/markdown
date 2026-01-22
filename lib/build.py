import shutil
import subprocess
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT / "build"


def run(cmd: str) -> None:
    result = subprocess.run(cmd.split(), cwd=str(ROOT))
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def clean_build_dir() -> None:
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)


def get_total_size(paths: Iterable[Path]) -> int:
    return sum(path.stat().st_size for path in paths if path.is_file())


def format_bytes(byte_size: int) -> str:
    value = float(byte_size)
    for unit in ["B", "KB", "MB"]:
        if value < 1024:
            return f"{value:.2f} {unit}"
        value /= 1024
    return f"{byte_size} B"


def get_saved_percent(before: int, after: int) -> float:
    return ((before - after) / before) * 100.0


def main() -> None:
    print("Cleaning build directory...")
    clean_build_dir()

    print("Compiling TypeScript...")
    run("npx tsc")

    print("Minifying JavaScript...")
    files_before = list(BUILD_DIR.rglob("*"))
    size_before = get_total_size(files_before)

    run(
        "npx esbuild build/**/*.js --minify --format=esm --tree-shaking=true --target=es2018 --outdir=build --allow-overwrite --log-level=silent"
    )

    files_after = list(BUILD_DIR.rglob("*"))
    size_after = get_total_size(files_after)
    percent = get_saved_percent(size_before, size_after)

    print("Build complete!")
    print(f"Pre-minified size: {format_bytes(size_before)}")
    print(f"Post-minified size: {format_bytes(size_after)}")
    print(f"Saved: {format_bytes(size_before - size_after)} ({percent:.2f}%)")


if __name__ == "__main__":
    main()
