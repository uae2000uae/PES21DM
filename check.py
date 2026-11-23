"""The checks to run before every push: python check.py
Compiles the server modules, checks the syntax of every studio script (needs Node.js), and that index.html loads them all."""
import pathlib, py_compile, re, shutil, subprocess, sys

root = pathlib.Path(__file__).resolve().parent
bad = 0
for f in sorted(root.glob("*.py")):
    try:
        py_compile.compile(str(f), doraise=True)
    except py_compile.PyCompileError as e:
        bad += 1
        print("FAIL", f.name, e.msg)
page = (root / "index.html").read_text(encoding="utf-8")
loaded = re.findall(r'<script src="(js/app-[a-z-]+\.js)"></script>', page)
on_disk = sorted("js/" + f.name for f in (root / "js").glob("app-*.js"))
if sorted(loaded) != on_disk:
    bad += 1
    print("FAIL index.html loads", sorted(loaded), "but js/ has", on_disk)
if loaded and loaded[-1] != "js/app-boot.js":
    bad += 1
    print("FAIL js/app-boot.js must be the last script")
node = shutil.which("node")
if not node:
    bad += 1
    print("FAIL Node.js not found: the script files were not checked")
else:
    for f in loaded + ["js/platform.js"]:
        r = subprocess.run([node, "--check", str(root / f)], capture_output=True, text=True)
        if r.returncode:
            bad += 1
            print("FAIL", f, r.stderr.strip().splitlines()[:3])
# the scripts share one global scope: a const, let or class declared at the top of two files stops the second file loading
seen = {}
for f in loaded + ["js/platform.js"]:
    for name in re.findall(r"(?m)^(?:const|let|class)\s+([A-Za-z_$][\w$]*)", (root / f).read_text(encoding="utf-8")):
        if name in seen and seen[name] != f:
            bad += 1
            print("FAIL", name, "is declared at the top of both", seen[name], "and", f)
        seen.setdefault(name, f)
print("checks failed: %d" % bad if bad else "all checks passed (%d Python files, %d script files)" % (len(list(root.glob("*.py"))), len(loaded) + 1))
sys.exit(1 if bad else 0)
