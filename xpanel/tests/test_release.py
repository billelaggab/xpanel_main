import hashlib
import io
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request
from zipfile import ZipFile, ZipInfo

import install

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / 'xpanel' / 'xpanel.zip'


class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = PACKAGE.read_bytes()
        cls.digest = hashlib.sha256(cls.payload).hexdigest()
        cls.files = install._xpanel_zip_members(cls.payload)

    def archive(self, prefix='', extra=None, attributes=None):
        stream = io.BytesIO()
        with ZipFile(stream, 'w') as zip_file:
            for name, content in self.files.items():
                item = ZipInfo(prefix + name)
                item.create_system = 0  # Exercise a ZIP from a non-Unix tool.
                item.external_attr = 0x20
                zip_file.writestr(item, content)
            if extra:
                for name, data in extra.items():
                    item = ZipInfo(name)
                    if attributes is not None:
                        item.create_system = 3
                        item.external_attr = attributes
                    zip_file.writestr(item, data)
        return stream.getvalue()

    def test_release_paths(self):
        self.assertEqual(set(self.files), install.XPANEL_REQUIRED)
        self.assertEqual(len(self.files), 11)
        self.assertEqual((PACKAGE.parent / 'xpanel.zip.sha256').read_text().split()[0], self.digest)
        for name, content in self.files.items():
            self.assertEqual((PACKAGE.parent / 'release' / name).read_bytes(), content)

    def test_manual_zip_layouts_ignore_non_deployable_sources(self):
        for prefix in ('./', 'xpanel/', 'release/', 'xpanel/release/'):
            with self.subTest(prefix=prefix):
                self.assertEqual(install._xpanel_zip_members(self.archive(prefix, {'xpanel/web/Panel.tsx': b'source'})), self.files)

    def test_rejects_missing_or_multiple_candidate_roots(self):
        with self.assertRaises(ValueError):
            install._xpanel_zip_members(self.archive('unexpected/'))
        with self.assertRaises(ValueError):
            install._xpanel_zip_members(self.archive(extra={'xpanel/' + name: data for name, data in self.files.items()}))

    def test_rejects_unsafe_members(self):
        for name in ('../outside.php', '/etc/passwd', r'xpanel\bad', './admin/index.php'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                install._xpanel_zip_members(self.archive(extra={name: b'ignored'}))
        with self.assertRaises(ValueError):
            install._xpanel_zip_members(self.archive(extra={'xpanel/link': b'../outside'}, attributes=(stat.S_IFLNK | 0o777) << 16))
        with self.assertRaises(ValueError):
            install._xpanel_zip_members(b'<html>not a ZIP</html>')

    def test_github_url_and_redirect_policy(self):
        self.assertEqual(install.xpanel_release_url('owner/panel'), 'https://github.com/owner/panel/releases/latest/download/xpanel.zip')
        self.assertEqual(install.xpanel_release_url('owner/panel', 'v1.2.3'), 'https://github.com/owner/panel/releases/download/v1.2.3/xpanel.zip')
        self.assertEqual(install.xpanel_release_url('owner/panel', 'release/stable'), 'https://github.com/owner/panel/releases/download/release%2Fstable/xpanel.zip')
        for value in ('https://github.com/owner/panel', 'owner/..', 'owner/panel/other'):
            with self.assertRaises(ValueError):
                install.xpanel_release_url(value)
        redirect = install.XPanelReleaseRedirect()
        source = Request(install.xpanel_release_url('owner/panel'))
        dest = 'https://release-assets.githubusercontent.com/sample-asset'
        self.assertEqual(redirect.redirect_request(source, None, 302, '', {}, dest).full_url, dest)
        for dest in ('http://github.com/asset', 'https://github.com.example.test/asset', 'https://github.com:444/asset'):
            with self.assertRaises(ValueError):
                redirect.redirect_request(source, None, 302, '', {}, dest)

    def test_release_download_bounded_and_404_descriptive(self):
        url = install.xpanel_release_url('owner/panel')
        with patch.object(install, 'build_opener') as factory:
            opener = factory.return_value
            stream = opener.open.return_value.__enter__.return_value
            stream.headers = {'Content-Length': str(len(self.payload))}
            stream.read.return_value = self.payload
            self.assertEqual(install._xpanel_fetch_release(url), self.payload)
            self.assertEqual(opener.open.call_args.args[0].full_url, url)
            stream.read.assert_called_once_with(install.XPANEL_MAX_ZIP + 1)
            opener.open.side_effect = HTTPError(url, 404, 'Not Found', {}, None)
            with self.assertRaisesRegex(ValueError, r'xpanel\.zip'):
                install._xpanel_fetch_release(url)

    def test_remote_pin_verified_and_required_before_network(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(install, '_xpanel_fetch_release', return_value=self.payload) as fetch:
            base = ['--check-xpanel', '--github-repo', 'owner/panel', '--release-tag', 'v1.2.3']
            with self.assertRaises(ValueError):
                install.load_xpanel(install.parse_xpanel_cli(base))
            fetch.assert_not_called()
            bundle = install.load_xpanel(install.parse_xpanel_cli(base + ['--sha256', 'sha256:' + self.digest.upper()]))
            fetch.assert_called_once_with('https://github.com/owner/panel/releases/download/v1.2.3/xpanel.zip')
            self.assertEqual(bundle.files, self.files)
            self.assertTrue(bundle.compared)
            with self.assertRaisesRegex(ValueError, 'غير مطابقة'):
                install.load_xpanel(install.parse_xpanel_cli(base + ['--sha256', '0' * 64]))

    def test_cli_source_overrides_environment_and_reads_sidecar(self):
        with patch.dict(os.environ, {'XPANEL_GITHUB_REPO': 'owner/panel', 'XPANEL_GITHUB_TAG': 'v1.2.3'}, clear=True):
            args = install.parse_xpanel_cli(['--check-xpanel', '--xpanel-zip', str(PACKAGE)])
            bundle = install.load_xpanel(args)
            self.assertEqual(bundle.source, str(PACKAGE))
            self.assertTrue(bundle.compared)
        with patch.dict(os.environ, {'XPANEL_ZIP': str(PACKAGE), 'XPANEL_GITHUB_REPO': 'owner/panel'}, clear=True):
            with self.assertRaises(ValueError):
                install.load_xpanel(install.parse_xpanel_cli(['--check-xpanel']))

    def test_standalone_installer(self):
        with tempfile.TemporaryDirectory(prefix='xpanel-check-') as directory:
            root = Path(directory)
            script = shutil.copyfile(ROOT / 'install.py', root / 'install.py')
            shutil.copyfile(PACKAGE, root / PACKAGE.name)
            env = {key: val for key, val in os.environ.items() if not key.startswith('XPANEL_')}
            result = subprocess.run([sys.executable, '-I', script, '--check-xpanel'], cwd=root, env=env, capture_output=True, text=True, check=True)
            self.assertIn('validated 11 files', result.stdout)
            self.assertIn(self.digest, result.stdout)

    def test_deploys_single_archive_to_temporary_target(self):
        with tempfile.TemporaryDirectory(prefix='xpanel-deploy-') as directory:
            root = Path(directory).resolve()
            target, state = root / 'site', root / 'state'
            settings = {'username': 'test-user', 'iterations': 600000, 'salt': '0' * 32, 'digest': '1' * 64}
            route = install.deploy_xpanel(target, state, 'test-xpanel-01', None, settings, self.files)
            self.assertEqual(route, '/test-xpanel-01/')
            self.assertEqual((target / 'admin/index.php').read_bytes(), self.files['admin/index.php'])
            conf = (target / install.XPANEL_CONF).read_text()
            self.assertIn(str(state), conf)
            self.assertIn(route, conf)
            self.assertNotIn('randomcodehere', conf)
            self.assertEqual(stat.S_IMODE((state / 'auth.json').stat().st_mode), 0o640)


if __name__ == '__main__':
    unittest.main()
