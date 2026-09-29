import importlib.util
import json
import tempfile
import unittest
import zipfile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


deploy = load("jatos_deploy", ROOT / "scripts" / "jatos_deploy.py")
builder = load("build_study_assets", ROOT / "scripts" / "build_study_assets.py")


class JatosScriptsTest(unittest.TestCase):
    def test_parse_wrapped_and_legacy_jzip_identity(self):
        for payload in (
            {"data":{"title":"Verbal N-back pre", "uuid":"uuid-1"}},
            {"title":"Verbal N-back pre", "uuid":"uuid-1"},
        ):
            with tempfile.TemporaryDirectory() as directory:
                archive_path = Path(directory) / "study.jzip"
                with zipfile.ZipFile(archive_path, "w") as archive:
                    archive.writestr("study.jas", json.dumps(payload))
                self.assertEqual(deploy.parse_jzip_identity(archive_path), ("Verbal N-back pre", "uuid-1"))

    def test_build_contains_only_runtime_assets_and_jatos_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "study-assets"
            builder.build(output)
            html = (output / "index.html").read_text(encoding="utf-8")
            info = json.loads((output / "build-info.json").read_text(encoding="utf-8"))
            self.assertIn('src="jatos.js"', html)
            self.assertIn("NBACK_STORAGE_BACKEND = 'jatos'", html)
            self.assertNotIn("NBACK_STORAGE_BACKEND = 'local'", html)
            self.assertEqual(info["component_entry"], "index.html")
            self.assertEqual(info["formal_trials"], 222)
            self.assertEqual(info["debug_trials"], 5)
            self.assertFalse((output / "source").exists())
            self.assertFalse(any(path.suffix.lower() in {".csv", ".xlsx", ".edat", ".txt"} for path in output.rglob("*")))


if __name__ == "__main__":
    unittest.main()
