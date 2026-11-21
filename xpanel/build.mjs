import { build } from "esbuild";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));
const staging = await mkdtemp(join(tmpdir(), "xpanel-build-"));
try {
  await build({
    absWorkingDir: root,
    entryPoints: { app: "xpanel/web/standalone.tsx" },
    outdir: staging,
    assetNames: "[name]",
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2022"],
    loader: { ".woff2": "file" },
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "inline",
  });
  const licenses = await Promise.all(["@fontsource-variable/cairo", "react", "react-dom", "scheduler", "lucide-react"].map(async (name) => {
    return `${name}\n${await readFile(join(root, "node_modules", name, "LICENSE"), "utf-8")}`;
  }));
  await writeFile(join(staging, "LICENSES.txt"), licenses.join("\n\n---\n\n"));
  execFileSync("python3", ["-c", String.raw`
from hashlib import sha256
from pathlib import Path
from shutil import copyfile, rmtree
from stat import S_IFREG
from sys import argv
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root, generated = map(Path, argv[1:])
assets = ('app.css', 'app.js', 'LICENSES.txt', 'cairo-arabic-wght-normal.woff2', 'cairo-latin-wght-normal.woff2', 'cairo-latin-ext-wght-normal.woff2')
static = ('admin/index.php', 'admin/api.php', 'admin/bootstrap.php', 'nginx/conf/admin_panel.conf', 'nginx/conf/xpanel_http.conf')
files = {name: root / 'compat' / name for name in static}
files.update({'admin/assets/' + name: generated / name for name in assets})

with TemporaryDirectory(prefix='.xpanel-release-', dir=str(root)) as directory:
    staged = Path(directory)
    release = staged / 'release'
    bundle = staged / 'xpanel.zip'
    with ZipFile(bundle, 'w') as archive:
        for relative, source in sorted(files.items()):
            destination = release / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            copyfile(source, destination)
            destination.chmod(0o644)
            entry = ZipInfo(relative, date_time=(2024, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = (S_IFREG | 0o644) << 16
            archive.writestr(entry, destination.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(bundle) as archive:
        if set(archive.namelist()) != set(files) or archive.testzip() is not None:
            raise ValueError('Invalid build output')
    digest = sha256(bundle.read_bytes()).hexdigest() + '  xpanel.zip'
    checksum = staged / 'xpanel.zip.sha256'
    checksum.write_text(digest + '\n', encoding='ascii')

    outputs = (release, bundle, checksum)
    for output in outputs:
        final = root / output.name
        if final.is_symlink() or (final.exists() and final.is_dir() != output.is_dir()):
            raise ValueError('Unexpected output path: ' + str(final))
    previous = staged / 'previous'
    previous.mkdir()
    replaced = []
    try:
        for output in outputs:
            final = root / output.name
            if final.exists():
                final.replace(previous / final.name)
            output.replace(final)
            replaced.append(final)
    except OSError:
        for final in reversed(replaced):
            if final.is_dir(): rmtree(final)
            else: final.unlink()
        for old in previous.iterdir():
            old.replace(root / old.name)
        raise
print(digest)
`, here, staging], { stdio: "inherit" });
} finally {
  await rm(staging, { recursive: true, force: true });
}
