from pathlib import Path

EXTENSIONS = {".tsx", ".ts", ".js", ".json", ".html", ".md"}
IGNORE_DIRS = {
    "node_modules",
    ".git",
    "build",
}


def success(message: str) -> None:
    print(f"\033[92m{message}\033[0m")


def info(message: str) -> None:
    print(f"\033[96m{message}\033[0m")


def warn(message: str) -> None:
    print(f"\033[93m{message}\033[0m")


def prompt(label: str, transform=None) -> str:
    value = ""
    while not value:
        value = input(label).strip()
        if transform:
            value = transform(value)
    return value


def slugify(value: str) -> str:
    return value.strip().lower().replace(" ", "-").replace("_", "-")


def iter_target_files(root: Path) -> list[Path]:
    files = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if path.suffix not in EXTENSIONS:
            continue
        files.append(path)
    return files


def replace_in_file(path: Path, replacements: list[tuple[str, str]]) -> bool:
    original = path.read_text(encoding="utf-8")

    updated = original
    for cur, sub in replacements:
        updated = updated.replace(cur, sub)

    if updated == original:
        return False

    path.write_text(updated, encoding="utf-8")
    return True


def replace_strings(files: list[Path], replacements: list[tuple[str, str]]) -> None:
    changed = 0
    for file in files:
        if replace_in_file(file, replacements):
            changed += 1
    success(f"Autoreplaced strings in {changed} file(s)!")


def replace_readmes(name: str, description: str) -> None:
    readme_text = f"# {name}\n\n{description}\n"
    Path("README.md").write_text(readme_text, encoding="utf-8")
    Path("lib/README.md").write_text(readme_text, encoding="utf-8")


def self_delete(script_path: Path) -> None:
    script_path.unlink()
    success("Finished setting up!")


def main() -> None:
    root = Path(".").resolve()
    script_path = Path(__file__).resolve()

    repo_name = prompt(
        "What is the name of the repository?\n(e.g. ui, omit the @adamjanicki/)\n>>> ",
        transform=slugify,
    )

    description = prompt("What is the description of your project?\n>>> ")
    replacements = [
        ("npm-skeleton", repo_name),
        ("Skeleton/template for an NPM package", description),
    ]

    print(f"Setting up {repo_name}...")

    replace_readmes(repo_name, description)

    files = iter_target_files(root)
    replace_strings(files, replacements)

    print("Cleaning up...")
    self_delete(script_path)

    info("Run `npm install` and then `npm run build` or `npm run test` in lib")


if __name__ == "__main__":
    main()
