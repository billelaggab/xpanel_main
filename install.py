#!/usr/bin/python3
# -*- coding: utf-8 -*-
#
#  XPanel installer and legacy MAIN/LB integration (Python 3)
#  ---------------------------------------------------------------------------
#  XPanel ships as xpanel.zip from a local file or a public GitHub Release.
#  Use --check-xpanel or --xpanel-only to avoid the legacy system setup.
#  The legacy path retains the earlier Python 3 and package updates:
#
#    Python 2.7 ................ -> Python 3.8+  (Ubuntu 20.04 / 22.04 / 24.04)
#    urllib2 ................... -> urllib.request
#    itertools.izip ............ -> zip()
#    str.encode("base64") ...... -> base64.b64encode()
#    libcurl3 .................. -> libcurl4 / libcurl4t64  (24.04 time64 rename)
#    mcrypt .................... -> openssl
#    nscd ...................... -> systemd-resolved
#    libpng12-0 (CVE-2015-8126)  -> libpng16-16 / libpng16-16t64
#    libgeoip-dev (legacy GeoIP) -> libmaxminddb-dev (GeoIP2 / .mmdb)
#    libjemalloc1 .............. -> libjemalloc2
#    python-paramiko ........... -> python3-paramiko
#    wget -q -O <url> .......... -> urllib.request downloader (no shell quoting)
#    os.system("... %s ..." % x) -> subprocess.run([...]) + shlex.quote (no injection)
#    /etc/sudoers edit ......... -> /etc/sudoers.d/xtreamcodes drop-in
#    mysql.service overwrite ... -> systemd drop-in override
#    GRANT ... IDENTIFIED BY ... -> CREATE USER ... ; GRANT ...   (MySQL 8 syntax)
#    mysql_native_password ..... -> version aware auth block (caching_sha2_password
#                                   on MySQL 8.4+, native plugin only when present)
#    query_cache_* ............. -> removed (dropped in MySQL 8.0)
#    expire_logs_days .......... -> binlog_expire_logs_seconds
#    innodb_log_file_size ...... -> innodb_redo_log_capacity (MySQL 8.0.30+)
#    innodb_buffer_pool_instances-> emitted only on releases that still accept it
#    Ubuntu 16.04 / 18.04 ...... -> Ubuntu 20.04 / 22.04 / 24.04
#    MaxMind direct .mmdb pull .. -> geoipupdate + MAXMIND_LICENSE_KEY when set
#
#  i am lazy to prepare echo versions with escaped characters, use base64
#  decode/encode to read or change these.
#
import argparse
import base64
import getpass
import glob
import grp
import hashlib
import hmac
import io
import json
import os
import random
import re
import secrets
import shlex
import shutil
import socket
import stat
import string
import subprocess
import sys
import tempfile
import time
import zlib
from dataclasses import dataclass
from http.client import IncompleteRead
from itertools import cycle
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote as url_quote, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen
from zipfile import BadZipFile, ZipFile, ZIP_DEFLATED, ZIP_STORED

XPANEL_STATE = Path('/var/lib/xpanel')
XPANEL_SOURCE = Path(__file__).resolve().parent / 'xpanel'
XPANEL_ARCHIVE = 'xpanel.zip'
XPANEL_CONF = 'nginx/conf/admin_panel.conf'
XPANEL_HTTP_CONF = 'nginx/conf/xpanel_http.conf'
XPANEL_ADMIN = frozenset('admin/' + member for member in (
    'index.php', 'api.php', 'bootstrap.php', 'assets/app.js', 'assets/app.css',
    'assets/LICENSES.txt', 'assets/cairo-arabic-wght-normal.woff2',
    'assets/cairo-latin-wght-normal.woff2', 'assets/cairo-latin-ext-wght-normal.woff2',
))
XPANEL_REQUIRED = XPANEL_ADMIN | {XPANEL_CONF, XPANEL_HTTP_CONF}
XPANEL_MAX_ZIP = 16 * 1024 * 1024
XPANEL_RELEASE_HOSTS = frozenset((
    'github.com', 'release-assets.githubusercontent.com',
    'objects.githubusercontent.com', 'github-releases.githubusercontent.com',
))
XPANEL_NGINX_PATH = re.compile(r'/[A-Za-z0-9_./-]+\Z')
XPANEL_ACCESS_CODE = re.compile(r'[A-Za-z0-9_-]{10,64}\Z')


@dataclass(frozen=True)
class XPanelBundle:
    files: dict
    source: str
    sha256: str
    compared: bool


def xpanel_release_url(repo, tag=None):
    if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9_.-]{1,100}', repo):
        raise ValueError('billelaggab/xpanel_main')
    if repo.split('/')[1] in ('.', '..'):
        raise ValueError('اسم مستودع GitHub غير صالح.')
    if tag is not None:
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]{0,127}', tag) or set(tag.split('/')) & {'', '.', '..'}:
            raise ValueError('وسم الإصدار غير صالح.')
        scheme = 'download/' + url_quote(tag, safe='')
    else:
        scheme = 'latest/download'
    return 'https://github.com/' + repo + '/releases/' + scheme + '/' + XPANEL_ARCHIVE


class XPanelReleaseRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urlparse(newurl)
        if (url.scheme != 'https' or url.hostname not in XPANEL_RELEASE_HOSTS or
                url.username is not None or url.password is not None or url.port not in (None, 443)):
            raise ValueError('أعيد توجيه التنزيل إلى عنوان غير معتمد.')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _xpanel_fetch_release(url):
    opener = build_opener(XPanelReleaseRedirect())
    request = Request(url, headers={'User-Agent': 'XPanel-Installer/1.1', 'Accept': 'application/zip, application/octet-stream'})
    try:
        with opener.open(request, timeout=25) as response:
            size = response.headers.get('Content-Length', '')
            if size.isdecimal() and int(size) > XPANEL_MAX_ZIP:
                raise ValueError('حجم أصل الإصدار أكبر من 16 ميبيبايت.')
            return response.read(XPANEL_MAX_ZIP + 1)
    except HTTPError as error:
        if error.code == 404:
            raise ValueError('لم يوجد xpanel.zip في أصول الإصدار العام المحدد.') from error
        raise ValueError('أرجع GitHub خطأ HTTP %s.' % error.code) from error
    except (URLError, TimeoutError, IncompleteRead) as error:
        raise ValueError('تعذر إكمال تنزيل xpanel.zip من GitHub Releases.') from error


def _xpanel_sha256(value):
    value = value.strip()
    if value.lower().startswith('sha256:'):
        value = value[7:]
    if not re.fullmatch(r'[0-9a-fA-F]{64}', value):
        raise ValueError('بصمة SHA-256 يجب أن تتكون من 64 رمزًا سداسيًا.')
    return value.lower()


def _xpanel_local_digest(path):
    sidecar = path.with_name(path.name + '.sha256')
    if not sidecar.exists():
        return None
    if not sidecar.is_file():
        raise ValueError('ملف بصمة الحزمة المحلية غير صالح.')
    with sidecar.open(encoding='ascii') as stream:
        line = stream.read(1025).strip()
    match = re.fullmatch(r'([0-9a-fA-F]{64})(?:[ \t]+\*?[^\r\n]+)?', line)
    if not match or len(line) > 1024:
        raise ValueError('ملف بصمة الحزمة المحلية غير صالح: ' + sidecar.name)
    return match[1].lower()


def _xpanel_zip_members(payload):
    if not payload or len(payload) > XPANEL_MAX_ZIP:
        raise ValueError('حزمة XPanel فارغة أو أكبر من 16 ميبيبايت.')
    try:
        with ZipFile(io.BytesIO(payload)) as archive:
            index = {}
            members = archive.infolist()
            if len(members) > 512 or sum(item.file_size for item in members) > 64 * 1024 * 1024:
                raise ValueError('بنية الحزمة أكبر من الحدود المسموح بها.')
            for item in members:
                name = item.orig_filename
                if not name or name.startswith('/') or re.search(r'[\\:\x00-\x1f\x7f]', name):
                    raise ValueError('اسم ملف غير صالح داخل الحزمة.')
                while name.startswith('./'):
                    name = name[2:]
                if not name:
                    continue  # Optional ./ directory entry emitted by some ZIP tools.
                parts = name.rstrip('/').split('/')
                kind = stat.S_IFMT(item.external_attr >> 16)
                if (set(parts) & {'', '.', '..'} or item.flag_bits & 1 or
                        kind not in (0, stat.S_IFDIR if item.is_dir() else stat.S_IFREG)):
                    raise ValueError('الحزمة تحتوي مسارًا غير آمن أو عضوًا غير عادي.')
                canonical = '/'.join(parts)
                if canonical in index:
                    raise ValueError('اسم ملف مكرر داخل الحزمة: ' + canonical)
                index[canonical] = item
            prefixes = ('', 'xpanel/', 'release/', 'xpanel/release/')
            roots = [p for p in prefixes if all(p + name in index and not index[p + name].is_dir() for name in XPANEL_REQUIRED)]
            if len(roots) != 1:
                raise ValueError('لم يوجد تخطيط XPanel صالح ووحيد؛ ابنِ الحزمة بـ node xpanel/build.mjs.')
            result = {}
            for name in sorted(XPANEL_REQUIRED):
                item = index[roots[0] + name]
                if not 0 < item.file_size <= 2_000_000 or item.compress_type not in (ZIP_DEFLATED, ZIP_STORED):
                    raise ValueError('حجم ملف أو نوع ضغط غير مدعوم: ' + name)
                result[name] = archive.read(item)
            return result
    except (BadZipFile, RuntimeError, NotImplementedError, zlib.error) as error:
        raise ValueError('أرشيف XPanel تالف أو ليس ملف ZIP مدعومًا.') from error


def load_xpanel(args):
    # A command-line source overrides sources supplied by environment variables.
    local, repo = args.xpanel_zip, args.github_repo
    if local is None and repo is None:
        local = os.environ.get('https://github.com/billelaggab/xpanel_main/releases/download/latest/xpanel.zip') or None
        repo = os.environ.get('https://github.com/billelaggab/xpanel_main') or None
        if local and repo:
            raise ValueError('https://github.com/billelaggab/xpanel_main')
    tag = args.release_tag or (os.environ.get('XPANEL_GITHUB_TAG') if repo else None) or None
    expected = args.sha256 if args.sha256 is not None else os.environ.get('XPANEL_SHA256') or None
    if tag and not repo:
        raise ValueError('--release-tag يتطلب مستودع GitHub.')
    expected = _xpanel_sha256(expected) if expected else None
    if repo:
        source = xpanel_release_url(repo, tag)
        if not expected:
            raise ValueError('يجب تثبيت بصمة الإصدار بـ --sha256 أو XPANEL_SHA256 قبل التنزيل.')
        payload = _xpanel_fetch_release(source)
    else:
        path = Path(local).expanduser() if local else next((
            candidate for candidate in (XPANEL_SOURCE.parent / XPANEL_ARCHIVE, XPANEL_SOURCE / XPANEL_ARCHIVE)
            if candidate.is_file()
        ), None)
        if path is None or not path.is_file():
            raise ValueError('لم يوجد xpanel.zip؛ حدّد --xpanel-zip أو --github-repo.')
        source = str(path.resolve())
        expected = expected or _xpanel_local_digest(path)
        with path.open('rb') as stream:
            payload = stream.read(XPANEL_MAX_ZIP + 1)
    if len(payload) > XPANEL_MAX_ZIP:
        raise ValueError('ملف xpanel.zip أكبر من 16 ميبيبايت.')
    actual = hashlib.sha256(payload).hexdigest()
    if expected and not hmac.compare_digest(expected, actual):
        raise ValueError('بصمة SHA-256 غير مطابقة؛ لم تُعتمد الحزمة.')
    return XPanelBundle(_xpanel_zip_members(payload), source, actual, expected is not None)

def _directory(path, mode=0o755):
    if path.is_symlink() or (path.exists() and not path.is_dir()):
        raise ValueError('المسار ليس مجلدًا عاديًا: ' + str(path))
    path.mkdir(mode=mode, exist_ok=True, parents=True)


def _path(raw):
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    path = Path(os.path.abspath(str(path)))
    if path.resolve() != path or not XPANEL_NGINX_PATH.fullmatch(str(path)):
        raise ValueError('استخدم مسارًا عاديًا، دون فراغات أو روابط رمزية: ' + str(path))
    return path


def _owner(path, group, mode):
    if group is not None:
        os.chown(path, -1, group)
    os.chmod(path, mode)


def _atomic(file, content, mode=0o644, group=None):
    fd, pending = tempfile.mkstemp(prefix='.xpanel-', dir=str(file.parent))
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content)
        _owner(pending, group, mode)
        os.replace(pending, file)
    finally:
        if os.path.exists(pending):
            os.unlink(pending)


def _is_inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def read_credentials(state, username=None, rotate=False):
    state = _path(state)
    auth = state / 'auth.json'
    if auth.is_symlink() or (auth.exists() and not auth.is_file()):
        raise ValueError('مسار بيانات الدخول غير صالح.')
    if auth.exists() and not rotate:
        return None  # Existing credentials are never overwritten implicitly.
    name = username or input('اسم مستخدم XPanel: ').strip()
    if not re.fullmatch(r'[A-Za-z0-9_.-]{3,48}', name):
        raise ValueError('استخدم 3–48 حرفًا لاتينيًا أو رقمًا لاسم المستخدم.')
    password = getpass.getpass('كلمة مرور XPanel (12 محرفًا على الأقل): ')
    if len(password) < 12 or len(password.encode('utf-8')) > 256 or password != getpass.getpass('أعد إدخال كلمة المرور: '):
        raise ValueError('كلمة المرور قصيرة أو غير متطابقة.')
    salt = secrets.token_bytes(16)
    rounds = 600_000
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, rounds).hex()
    return {'username': name, 'salt': salt.hex(), 'iterations': rounds, 'digest': digest}


def _state_dir(state, credentials, gid):
    _directory(state, 0o750)
    _owner(state, gid, 0o750)
    data = state / 'data'
    _directory(data, 0o770)
    _owner(data, gid, 0o2770 if gid is not None else 0o770)
    auth = state / 'auth.json'
    if auth.is_symlink() or (auth.exists() and not auth.is_file()):
        raise ValueError('مسار بيانات الدخول غير صالح.')
    if credentials is not None:
        _atomic(auth, json.dumps(credentials).encode('utf-8'), 0o640, gid)
    elif not auth.is_file():
        raise ValueError('بيانات الدخول غير متوفرة.')
    else:
        _owner(auth, gid, 0o640)


def _nginx_with_panel(target):
    source = target / 'nginx' / 'conf' / 'nginx.conf'
    if source.is_symlink() or not source.is_file() or source.stat().st_size > 400_000:
        raise ValueError('تعذر العثور على ملف Nginx الأساسي قبل ربط اللوحة.')
    config = source.read_text(encoding='utf-8')
    stripped = re.sub(r'(?m)^[ \t]*#[^\n]*', '', config)
    existing = re.search(r'(?m)^[ \t]*include\s+(?:[^;\s]+/)?xpanel_http\.conf\s*;', stripped)
    if existing:
        return None
    if re.search(r'\blisten\s+(?:[^\s;]+:)?8080(?:[\s;]|$)', stripped):
        if re.search(r'\binclude\s+(?:[^;\s]+/)?admin_panel\.conf\s*;', stripped):
            return None
        raise ValueError('منفذ اللوحة 8080 مستخدم في إعداد Nginx الحالي.')
    blocks = list(re.finditer(r'(?m)^[ \t]*http\s*\{', config))
    if len(blocks) != 1:
        raise ValueError('كتلة http في ملف Nginx غير واضحة؛ استخدم وضع اللوحة فقط.')
    offset = blocks[0].end()
    include = '\n    include ' + str(target / XPANEL_HTTP_CONF) + ';  # XPanel loopback server\n'
    return (config[:offset] + include + config[offset:]).encode('utf-8')


def deploy_xpanel(target, state, code, group, credentials, files, attach=False):
    """Publish first-party panel files. No package installs or service execution."""
    target = _path(target)
    state = _path(state)
    if target == target.parent or _is_inside(state, target) or _is_inside(target, state) or target == XPANEL_SOURCE or _is_inside(target, XPANEL_SOURCE):
        raise ValueError('اختر دليلاً للوحة وآخر للبيانات خارج جذر الويب ومجلد المصادر.')
    if not XPANEL_ACCESS_CODE.fullmatch(code):
        raise ValueError('معرّف المسار غير صالح.')
    gid = grp.getgrnam(group).gr_gid if group else None
    _directory(target)
    conf_dir = target / 'nginx' / 'conf'
    _directory(conf_dir.parent)
    _directory(conf_dir)
    old = target / 'admin'
    if old.is_symlink() or (old.exists() and not old.is_dir()):
        raise ValueError('مجلد اللوحة الحالي ليس مجلدًا عاديًا.')
    replacements = {
        target / name: files[name].decode('utf-8').replace('__XPANEL_ROOT__', str(target)).replace('__XPANEL_STATE__', str(state)).replace('randomcodehere', code).encode('utf-8')
        for name in (XPANEL_CONF, XPANEL_HTTP_CONF)
    }
    if attach:
        nginx_config = _nginx_with_panel(target)
        if nginx_config is not None:
            replacements[conf_dir / 'nginx.conf'] = nginx_config
    backups = {}
    for file in replacements:
        if file.is_symlink() or (file.exists() and (not file.is_file() or file.stat().st_size > 400_000)):
            raise ValueError('لا يمكن استبدال ملف Nginx: ' + str(file))
        backups[file] = file.read_bytes() if file.exists() else None
    _state_dir(state, credentials, gid)
    with tempfile.TemporaryDirectory(prefix='.xpanel-', dir=str(target)) as space:
        stage = Path(space)
        incoming = stage / 'admin'
        incoming.mkdir(mode=0o755)
        (incoming / 'assets').mkdir(mode=0o755)
        for name in sorted(XPANEL_ADMIN):
            local = incoming / name[len("admin/"):]
            local.write_bytes(files[name])
            local.chmod(0o644)
        backup = stage / 'previous-admin'
        previous = old.exists()
        if previous:
            os.replace(old, backup)
        written = []
        try:
            os.replace(incoming, old)
            for file, content in replacements.items():
                _atomic(file, content)
                written.append(file)
        except Exception:
            for file in reversed(written):
                if backups[file] is None:
                    file.unlink(missing_ok=True)
                else:
                    _atomic(file, backups[file])
            if old.is_dir():
                shutil.rmtree(old)
            if previous:
                os.replace(backup, old)
            raise
    return '/' + code + '/'

rDownloadURL = {
    "main": "https://github.com/emre1393/xtreamui_mirror/releases/latest/download/main.tar.gz",
    "sub": "https://github.com/emre1393/xtreamui_mirror/releases/latest/download/LB.tar.gz",
}

# ---------------------------------------------------------------------------
# MODERNIZED package list.
# The last THREE entries are MAIN-server only and get stripped for LB installs
# (rPackages[:-3]) exactly like the original script did.
# ---------------------------------------------------------------------------
rPackages = [
    "libcurl4",            # was: libcurl3            (removed from Ubuntu repos)
    "libxslt1-dev",        # still supported
    "libmaxminddb-dev",    # was: libgeoip-dev        (legacy GeoIP database EOL)
    "e2fsprogs",           # provides chattr
    "wget",                # kept: used by start_services.sh on some builds
    "openssl",             # was: mcrypt              (dropped from PHP 7.2 / dead upstream)
    "systemd-resolved",    # was: nscd                (nscd is deprecated upstream)
    "htop",
    "zip",
    "unzip",
    "mc",
    "libpng16-16",         # was: libpng12-0          (CVE-2015-8126, removed in 2016)
    "ca-certificates",     # needed for TLS downloads on minimal images
    "curl",                # diagnostics / health checks
    "lsb-release",         # lsb_release is no longer preinstalled on 22.04+
    "iproute2",            # modern `ip` tooling
    "net-tools",           # legacy `ifconfig`, still parsed by start_services.sh
    # ---- MAIN only (stripped with rPackages[:-3] on LB installs) ----
    "python3-paramiko",    # was: python-paramiko     (Python 2 only)
    "libjemalloc2",        # was: libjemalloc1
    "mysql-server",        # MySQL 8.0 (20.04/22.04) or 8.0/8.4 (24.04)
]

# Ubuntu 24.04 (noble) renamed many libraries for the 64-bit time_t transition.
rPackageAlternatives = {
    "libcurl4": ["libcurl4t64", "libcurl4"],
    "libpng16-16": ["libpng16-16t64", "libpng16-16"],
    "libmaxminddb-dev": ["libmaxminddb-dev", "libmaxminddb0", "libgeoip-dev"],
    "libjemalloc2": ["libjemalloc2", "libjemalloc1"],
    "python3-paramiko": ["python3-paramiko", "python-paramiko"],
    "openssl": ["openssl", "mcrypt"],
    "mysql-server": ["mysql-server", "mysql-server-8.0"],
    "systemd-resolved": ["systemd-resolved", "nscd"],
    "libxslt1-dev": ["libxslt1-dev", "libxslt1.1"],
}

rInstall = {"MAIN": "main", "LB": "sub"}

rMySQLCnfTemplate = base64.b64decode(
    "IyBYdHJlYW0gQ29kZXMgKE1vZGVybml6ZWQgYnVpbGQ6IE15U1FMIDguMCAvIDguNCBjb21wYXRpYmxlKQojIFJlZ2VuZXJhdGVkIGJ5IGluc3RhbGwucHkgLSB0aGUgZm9sbG93aW5nIGxlZ2FjeSBkaXJlY3RpdmVzIHdlcmUgUkVNT1ZFRCBiZWNhdXNlCiMgdGhleSBubyBsb25nZXIgZXhpc3QgaW4gc3VwcG9ydGVkIE15U1FMIHJlbGVhc2VzOgojICAgKiBxdWVyeV9jYWNoZV9saW1pdCAvIHF1ZXJ5X2NhY2hlX3NpemUgLyBxdWVyeV9jYWNoZV90eXBlICAoZHJvcHBlZCBpbiBNeVNRTCA4LjApCiMgICAqIGV4cGlyZV9sb2dzX2RheXMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChyZW1vdmVkIGluIE15U1FMIDguNCkKIyAgICogaW5ub2RiX2xvZ19maWxlX3NpemUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHJlbW92ZWQgaW4gTXlTUUwgOC40KQojICAgKiBpbm5vZGJfYnVmZmVyX3Bvb2xfaW5zdGFuY2VzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAocmVtb3ZlZCBpbiBNeVNRTCA4LjQpCiMgICAqIGRlZmF1bHRfYXV0aGVudGljYXRpb25fcGx1Z2luPW15c3FsX25hdGl2ZV9wYXNzd29yZCAgICAgIChyZW1vdmVkIGluIE15U1FMIDguNCkKCltjbGllbnRdCnBvcnQgICAgICAgICAgICA9IDMzMDYKc29ja2V0ICAgICAgICAgID0gL3Zhci9ydW4vbXlzcWxkL215c3FsZC5zb2NrCgpbbXlzcWxkX3NhZmVdCnNvY2tldCAgICAgICAgICA9IC92YXIvcnVuL215c3FsZC9teXNxbGQuc29jawpuaWNlICAgICAgICAgICAgPSAwCgpbbXlzcWxkXQp1c2VyICAgICAgICAgICAgPSBteXNxbApwaWQtZmlsZSAgICAgICAgPSAvdmFyL3J1bi9teXNxbGQvbXlzcWxkLnBpZApzb2NrZXQgICAgICAgICAgPSAvdmFyL3J1bi9teXNxbGQvbXlzcWxkLnNvY2sKcG9ydCAgICAgICAgICAgID0gNzk5OQpiYXNlZGlyICAgICAgICAgPSAvdXNyCmRhdGFkaXIgICAgICAgICA9IC92YXIvbGliL215c3FsCnRtcGRpciAgICAgICAgICA9IC90bXAKCmxjLW1lc3NhZ2VzLWRpciA9IC91c3Ivc2hhcmUvbXlzcWwKc2tpcC1leHRlcm5hbC1sb2NraW5nCnNraXAtbmFtZS1yZXNvbHZlID0gMQoKYmluZC1hZGRyZXNzICAgICAgICAgICAgPSAqCgp7YXV0aF9ibG9ja30KCmtleV9idWZmZXJfc2l6ZSA9IDEyOE0KbXlpc2FtX3NvcnRfYnVmZmVyX3NpemUgPSA0TQptYXhfYWxsb3dlZF9wYWNrZXQgICAgICA9IDY0TQpteWlzYW0tcmVjb3Zlci1vcHRpb25zICA9IEJBQ0tVUAptYXhfbGVuZ3RoX2Zvcl9zb3J0X2RhdGEgPSA4MTkyCnNvcnRfYnVmZmVyX3NpemUgPSAyTQpqb2luX2J1ZmZlcl9zaXplID0gMk0KcmVhZF9idWZmZXJfc2l6ZSA9IDFNCnJlYWRfcm5kX2J1ZmZlcl9zaXplID0gMU0KCntiaW5sb2dfYmxvY2t9Cm1heF9iaW5sb2dfc2l6ZSA9IDEwME0KdHJhbnNhY3Rpb25faXNvbGF0aW9uID0gUkVBRC1DT01NSVRURUQKbWF4X2Nvbm5lY3Rpb25zICA9IDEwMDAwCm9wZW5fZmlsZXNfbGltaXQgPSAxMDI0MAppbm5vZGJfb3Blbl9maWxlcyA9IDEwMjQwCm1heF9jb25uZWN0X2Vycm9ycyA9IDQwOTYKdGFibGVfb3Blbl9jYWNoZSA9IDQwOTYKdGFibGVfZGVmaW5pdGlvbl9jYWNoZSA9IDQwOTYKdG1wX3RhYmxlX3NpemUgPSAxRwptYXhfaGVhcF90YWJsZV9zaXplID0gMUcKbWF4X2V4ZWN1dGlvbl90aW1lID0gMApiYWNrX2xvZyA9IDQwOTYKCmlubm9kYl9idWZmZXJfcG9vbF9zaXplID0ge2J1ZmZlcl9wb29sX3NpemV9CntidWZmZXJfcG9vbF9pbnN0YW5jZXNfYmxvY2t9Cmlubm9kYl9yZWFkX2lvX3RocmVhZHMgPSA2NAppbm5vZGJfd3JpdGVfaW9fdGhyZWFkcyA9IDY0Cmlubm9kYl90aHJlYWRfY29uY3VycmVuY3kgPSAwCmlubm9kYl9mbHVzaF9sb2dfYXRfdHJ4X2NvbW1pdCA9IDAKaW5ub2RiX2ZsdXNoX21ldGhvZCA9IE9fRElSRUNUCnBlcmZvcm1hbmNlX3NjaGVtYSA9IDAKaW5ub2RiLWZpbGUtcGVyLXRhYmxlID0gMQppbm5vZGJfaW9fY2FwYWNpdHkgPSAxMDAwMAppbm5vZGJfaW9fY2FwYWNpdHlfbWF4ID0gMjAwMDAKaW5ub2RiX3RhYmxlX2xvY2tzID0gMAppbm5vZGJfbG9ja193YWl0X3RpbWVvdXQgPSA1MAppbm5vZGJfZGVhZGxvY2tfZGV0ZWN0ID0gMAp7cmVkb19sb2dfYmxvY2t9CgpzcWwtbW9kZSA9ICJOT19FTkdJTkVfU1VCU1RJVFVUSU9OIgoKCltteXNxbGR1bXBdCnF1aWNrCnF1b3RlLW5hbWVzCm1heF9hbGxvd2VkX3BhY2tldCAgICAgID0gMTI4TQpjb21wbGV0ZS1pbnNlcnQKCltteXNxbF0KCltpc2FtY2hrXQprZXlfYnVmZmVyX3NpemUgICAgICAgICAgICAgID0gMTZNCg=="
).decode("utf-8")

# systemd DROP-IN override. Replaces the old habit of overwriting
# /lib/systemd/system/mysql.service (that file is owned by the mysql-server
# package and gets restored/rejected on Ubuntu 20.04+).
rMySQLServiceFile = base64.b64decode(
    "IyBYdHJlYW0gQ29kZXMgTXlTUUwgdHVuaW5nLgojIE1vZGVybiByZXBsYWNlbWVudDogYSBzeXN0ZW1kIERST1AtSU4gb3ZlcnJpZGUgaW5zdGVhZCBvZiBvdmVyd3JpdGluZwojIC9saWIvc3lzdGVtZC9zeXN0ZW0vbXlzcWwuc2VydmljZSAodGhhdCBmaWxlIGlzIG93bmVkIGJ5IHRoZSBteXNxbC1zZXJ2ZXIKIyBwYWNrYWdlIGFuZCBpcyByZXN0b3JlZC9yZWplY3RlZCBvbiBVYnVudHUgMjAuMDQrKS4KIyBJbnN0YWxsZWQgdG86IC9ldGMvc3lzdGVtZC9zeXN0ZW0vbXlzcWwuc2VydmljZS5kL3h0cmVhbWNvZGVzLmNvbmYKIwojIExEX1BSRUxPQUQgKGplbWFsbG9jIDIpIGlzIE5PVCBoYXJkY29kZWQgaGVyZTogaXQgaXMgaW5qZWN0ZWQgdGhyb3VnaAojIEVudmlyb25tZW50RmlsZSBiZWxvdywgc28gYSBtaXNzaW5nIGxpYmplbWFsbG9jMiBjYW4gbmV2ZXIgc3RvcCBteXNxbGQuCgpbU2VydmljZV0KRW52aXJvbm1lbnRGaWxlPS0vZXRjL215c3FsL215c3FsZApMaW1pdE5PRklMRT01MDAwCkxpbWl0TlBST0M9NjU1MzUKVGltZW91dFNlYz02MDAKUmVzdGFydD1vbi1mYWlsdXJlCg=="
).decode("utf-8")

# Was: {"16.04": "xenial", "18.04": "bionic"}  (both reached End of Standard Support)
rVersions = {
    "20.04": "focal",
    "22.04": "jammy",
    "24.04": "noble",
}

rPaths = {
    "base": "/home/xtreamcodes",
    "xc": "/home/xtreamcodes/iptv_xtream_codes",
    "config": "/home/xtreamcodes/iptv_xtream_codes/config",
    "geoip": "/home/xtreamcodes/iptv_xtream_codes/GeoLite2.mmdb",
    "cnf": "/etc/mysql/my.cnf",
    "cnfBackup": "/etc/mysql/my.cnf.xc",
    "jemallocEnv": "/etc/mysql/mysqld",
    "serviceDropIn": "/etc/systemd/system/mysql.service.d/xtreamcodes.conf",
    "sudoersDropIn": "/etc/sudoers.d/xtreamcodes",
    "initd": "/etc/init.d/xtreamcodes",
    "systemdUnit": "/etc/systemd/system/xtreamcodes.service",
}

rJemalloc = "/usr/lib/x86_64-linux-gnu/libjemalloc.so.2"   # was libjemalloc.so.1
rMySQLSocket = "/var/run/mysqld/mysqld.sock"


class col:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    YELLOW = "\033[33m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def generate(length=32):
    """Cryptographically stronger replacement for random.choice() based codes."""
    try:
        import secrets
        rAlphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(rAlphabet) for _ in range(length))
    except ImportError:
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))


def getIP():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        rIP = s.getsockname()[0]
        s.close()
        return rIP
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def runShell(rCommand, rQuiet=True):
    """os.system() replacement. Returns the exit code, never raises."""
    if rQuiet:
        rCommand = "%s > /dev/null 2>&1" % rCommand
    return subprocess.call(rCommand, shell=True, executable="/bin/bash")


def runCommand(rArgs):
    """Safe argv runner - no shell interpolation, no command injection."""
    try:
        return subprocess.run(
            rArgs, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
        ).returncode
    except Exception:
        return 1


def quote(rValue):
    """Every user supplied value is quoted before it ever reaches a shell."""
    return shlex.quote(str(rValue))


def download(rURL, rDestination, rRetries=3):
    """wget -q -O replacement using urllib.request (Python 3, TLS verified)."""
    for rAttempt in range(1, rRetries + 1):
        try:
            rRequest = Request(rURL, headers={"User-Agent": "XtreamUI-Installer/2.0"})
            with urlopen(rRequest, timeout=120) as rResponse:
                with open(rDestination, "wb") as rFile:
                    shutil.copyfileobj(rResponse, rFile)
            if os.path.exists(rDestination) and os.path.getsize(rDestination) > 0:
                return True
        except Exception as rError:
            printc("Download attempt %d failed for %s (%s)" % (rAttempt, urlparse(rURL).path, rError), col.WARNING)
            time.sleep(2)
    return False


def getVersion():
    """lsb_release -d (human readable OS description)."""
    try:
        return (
            subprocess.check_output(["lsb_release", "-d"], stderr=subprocess.DEVNULL)
            .decode("utf-8", "replace")
            .split(":")[-1]
            .strip()
        )
    except Exception:
        return ""


def getVersionShort():
    """lsb_release -sr (e.g. 24.04)."""
    try:
        return (
            subprocess.check_output(["lsb_release", "-sr"], stderr=subprocess.DEVNULL)
            .decode("utf-8", "replace")
            .strip()
        )
    except Exception:
        try:
            for rLine in open("/etc/os-release").read().splitlines():
                if rLine.startswith("VERSION_ID="):
                    return rLine.split("=", 1)[-1].strip('"')
        except Exception:
            pass
    return ""


def getMySQLVersion():
    """
    Returns (major, minor, patch) of the installed server, (0, 0, 0) when unknown.
    Probes several sources because Ubuntu 24.04 ships MySQL 8.0/8.4 and some
    mirrors only expose `mysql` (not `mysqld`) on PATH.
    """
    for rProbe in (["mysqld", "--version"], ["mysql", "--version"], ["mariadbd", "--version"]):
        try:
            rOutput = subprocess.check_output(rProbe, stderr=subprocess.DEVNULL).decode(
                "utf-8", "replace"
            )
            for rToken in rOutput.replace(",", " ").split():
                rParts = rToken.split(".")
                if len(rParts) >= 2 and all(rPart.isdigit() for rPart in rParts[:3]):
                    return (
                        int(rParts[0]),
                        int(rParts[1]),
                        int(rParts[2]) if len(rParts) > 2 else 0,
                    )
        except Exception:
            continue

    # Fall back to the package manager when no binary is on PATH yet.
    for rPkg in ("mysql-server-8.4", "mysql-server-8.0", "mysql-community-server", "mariadb-server"):
        try:
            rOutput = subprocess.check_output(
                ["dpkg-query", "-W", "-f=${Version}", rPkg], stderr=subprocess.DEVNULL
            ).decode("utf-8", "replace")
            rDigits = ""
            for rChar in rOutput.strip():
                if rChar.isdigit() or rChar == ".":
                    rDigits += rChar
                elif rDigits:
                    break
            rParts = [rPart for rPart in rDigits.split(".") if rPart.isdigit()]
            if len(rParts) >= 2:
                return (int(rParts[0]), int(rParts[1]), int(rParts[2]) if len(rParts) > 2 else 0)
        except Exception:
            continue
    return (0, 0, 0)


def hasNativePasswordPlugin():
    """mysql_native_password is DISABLED by default since MySQL 8.4 and removed in 9.x."""
    rMajor, rMinor, _rPatch = getMySQLVersion()
    if rMajor == 0:
        return True
    if (rMajor, rMinor) < (8, 4):
        return True
    for rCandidate in (
        "/usr/lib/mysql/plugin/mysql_native_password.so",
        "/usr/lib/x86_64-linux-gnu/mysql/plugin/mysql_native_password.so",
    ):
        if os.path.exists(rCandidate):
            return True
    return False


def totalMemoryMB():
    try:
        with open("/proc/meminfo") as rFile:
            for rLine in rFile:
                if rLine.startswith("MemTotal:"):
                    return int(rLine.split()[1]) // 1024
    except Exception:
        pass
    return 0


def buildMySQLCnf(rRedoLogOverride=None):
    """
    Renders the my.cnf template for the ACTUAL server version installed.
    Directives that no longer exist upstream are never emitted.

    rRedoLogOverride: None = decide from the detected version,
                      True = force legacy innodb_log_file_size,
                      False = force modern innodb_redo_log_capacity.
    """
    rMajor, rMinor, rPatch = getMySQLVersion()
    rVersionKnown = rMajor != 0

    # --- authentication -------------------------------------------------
    if rMajor == 0:
        rAuthBlock = "default_authentication_plugin = caching_sha2_password"
    elif (rMajor, rMinor) >= (8, 4):
        rAuthBlock = "authentication_policy = *"
        if hasNativePasswordPlugin():
            rAuthBlock += "\nmysql_native_password = ON"
    else:
        if hasNativePasswordPlugin():
            rAuthBlock = "default_authentication_plugin = mysql_native_password"
        else:
            rAuthBlock = "default_authentication_plugin = caching_sha2_password"

    # --- binary log expiry (expire_logs_days removed in MySQL 8.4) -------
    rBinlogBlock = "binlog_expire_logs_seconds = 864000"

    # --- buffer pool: sized from real RAM instead of a hardcoded 8G -------
    rMemMB = totalMemoryMB()
    if rMemMB > 0:
        rPoolMB = max(512, min(8192, int(rMemMB * 0.6)))
    else:
        rPoolMB = 8192
    rPoolSize = "%dM" % rPoolMB

    # --- innodb_buffer_pool_instances removed in MySQL 8.4 ----------------
    if not rVersionKnown or (rMajor, rMinor) >= (8, 4):
        # Omitted on unknown/8.4+: the server auto-sizes it, which is safe everywhere.
        rInstancesBlock = "# innodb_buffer_pool_instances: omitted (removed in MySQL 8.4, auto-sized)"
    elif rPoolMB >= 1024:
        rInstancesBlock = "innodb_buffer_pool_instances = %d" % min(8, max(1, rPoolMB // 1024))
    else:
        rInstancesBlock = "innodb_buffer_pool_instances = 1"

    # --- redo log sizing (innodb_log_file_size removed in MySQL 8.4) ------
    if rRedoLogOverride is False:
        rRedoBlock = "innodb_redo_log_capacity = 1G"
    elif rRedoLogOverride is True:
        rRedoBlock = "innodb_log_file_size = 1G"
    elif rVersionKnown and (rMajor, rMinor, rPatch) >= (8, 0, 30):
        rRedoBlock = "innodb_redo_log_capacity = 1G"
    elif rVersionKnown:
        rRedoBlock = "innodb_log_file_size = 1G"
    else:
        # Version could not be probed: emit neither, keep the server default so
        # mysqld cannot refuse to boot on an unknown directive.
        rRedoBlock = "# redo log sizing left at the server default (version unknown)"

    return rMySQLCnfTemplate.format(
        auth_block=rAuthBlock,
        binlog_block=rBinlogBlock,
        buffer_pool_size=rPoolSize,
        buffer_pool_instances_block=rInstancesBlock,
        redo_log_block=rRedoBlock,
    )


def printc(rText, rColour=col.OKBLUE, rPadding=0):
    print("%s ┌──────────────────────────────────────────┐ %s" % (rColour, col.ENDC))
    for _i in range(rPadding):
        print("%s │                                          │ %s" % (rColour, col.ENDC))
    rLeft = 20 - (len(rText) // 2)
    print(
        "%s │ %s%s%s │ %s"
        % (rColour, " " * rLeft, rText, " " * (40 - rLeft - len(rText)), col.ENDC)
    )
    for _i in range(rPadding):
        print("%s │                                          │ %s" % (rColour, col.ENDC))
    print("%s └──────────────────────────────────────────┘ %s" % (rColour, col.ENDC))
    print(" ")


def installPackage(rPackage):
    """
    Installs a package, transparently falling back to its modern/legacy alias
    (handles the Ubuntu 24.04 't64' library renames).
    """
    for rCandidate in [rPackage] + rPackageAlternatives.get(rPackage, []):
        if runCommand(["apt-get", "install", "-y", rCandidate]) == 0:
            if rCandidate != rPackage:
                printc("%s installed as %s" % (rPackage, rCandidate), col.YELLOW)
            return True
    printc("Package unavailable: %s (skipped)" % rPackage, col.WARNING)
    return False


def createUser():
    """adduser --system is still supported, but useradd is the canonical tool now."""
    rArgs = ["useradd", "--system", "--shell", "/usr/sbin/nologin", "--user-group", "--no-create-home", "xtreamcodes"]
    if runCommand(rArgs) != 0:
        runShell(
            "adduser --system --shell /bin/false --group --disabled-login xtreamcodes"
        )


def prepare(rType="MAIN"):
    global rPackages
    if rType != "MAIN":
        rPackages = rPackages[:-3]

    printc("Preparing Installation")
    for rFile in [
        "/var/lib/dpkg/lock-frontend",
        "/var/cache/apt/archives/lock",
        "/var/lib/dpkg/lock",
    ]:
        try:
            os.remove(rFile)
        except OSError:
            pass

    os.environ["DEBIAN_FRONTEND"] = "noninteractive"
    runShell("apt-get update")

    printc("Removing libcurl4 if installed")
    # Original removed libcurl4 so the prebuilt binaries could load libcurl3.
    # libcurl3 is gone from every supported Ubuntu release, so the mirror now
    # ships binaries linked against libcurl4 - we instead purge the packages
    # that ARE obsolete (mcrypt / nscd) and keep libcurl4 installed.
    runShell("apt-get remove --auto-remove mcrypt nscd php-mcrypt -y")

    for rPackage in rPackages:
        printc("Installing %s" % rPackage)
        installPackage(rPackage)

    printc("Installing libpng")
    # Was: wget libpng12-0_1.2.54-1ubuntu1_amd64.deb && dpkg -i
    # libpng12-0 was removed from Ubuntu in 2016 and carries CVE-2015-8126.
    installPackage("libpng16-16")
    runShell("apt-get install -y")  # Clean up above
    if not os.path.exists("/etc/systemd/system/mysql.service.d"):
        try:
            os.makedirs("/etc/systemd/system/mysql.service.d")
        except OSError:
            pass

    try:
        subprocess.check_output(
            ["getent", "passwd", "xtreamcodes"], stderr=subprocess.DEVNULL
        )
    except Exception:
        # Create User
        printc("Creating user xtreamcodes")
        createUser()

    if not os.path.exists(rPaths["base"]):
        os.mkdir(rPaths["base"])
    return True


def install(rType="MAIN"):
    global rInstall, rDownloadURL
    printc("Downloading Software")
    try:
        rURL = rDownloadURL[rInstall[rType]]
    except KeyError:
        printc("Invalid download URL!", col.FAIL)
        return False

    rArchive = os.path.join(tempfile.gettempdir(), "xtreamcodes.tar.gz")
    if not download(rURL, rArchive):
        printc("Failed to download installation file!", col.FAIL)
        return False

    if os.path.exists(rArchive):
        printc("Installing Software")
        if os.path.exists(rPaths["geoip"]):
            runCommand(["chattr", "-f", "-i", rPaths["geoip"]])
        if runCommand(["tar", "-zxf", rArchive, "-C", rPaths["base"]]) != 0:
            printc("Failed to extract installation file!", col.FAIL)
            return False
        try:
            os.remove(rArchive)
        except OSError:
            pass
        return True

    printc("Failed to download installation file!", col.FAIL)
    return False


def installadminpanel(rAccesscode, rCredentials, rBundle):
    printc("Installing XPanel from xpanel.zip")
    try:
        return deploy_xpanel(
            Path(rPaths["xc"]), XPANEL_STATE, rAccesscode,
            "xtreamcodes", rCredentials, rBundle.files, attach=True,
        )
    except (OSError, ValueError, KeyError) as rError:
        print("XPanel: %s" % rError, file=sys.stderr)
        return None


def mysqlQuery(rStatements, rExtra=""):
    """Runs a batch of statements through one mysql client invocation."""
    rCommand = "mysql --protocol=socket -S %s -u root%s -e %s" % (
        quote(rMySQLSocket),
        rExtra,
        quote(" ".join(rStatements)),
    )
    return runShell(rCommand)


def writeAndValidateCnf():
    """
    Writes /etc/mysql/my.cnf and validates it with the real server binary
    (`mysqld --validate-config`, available since MySQL 8.0.16). When a directive
    is rejected we flip the redo-log strategy and try again, so an unexpected
    MySQL release can never leave the server unable to boot.
    """
    rAttempts = [None, False, True]
    for rOverride in rAttempts:
        with open(rPaths["cnf"], "w") as rFile:
            rFile.write(buildMySQLCnf(rOverride))
        rCode = runShell(
            "mysqld --validate-config --defaults-file=%s" % quote(rPaths["cnf"])
        )
        if rCode == 0:
            if rOverride is not None:
                printc("my.cnf auto-corrected for this MySQL release", col.YELLOW)
            return True
        # --validate-config unsupported on very old builds: trust the file.
        if shutil.which("mysqld") is None:
            return True
    printc("my.cnf could not be validated, keeping the safest variant", col.WARNING)
    with open(rPaths["cnf"], "w") as rFile:
        rFile.write(buildMySQLCnf(None))
    return False


def mysql(rUsername, rPassword):
    global rMySQLCnfTemplate
    printc("Configuring MySQL")

    rCreate = True
    if os.path.exists(rPaths["cnf"]):
        try:
            with open(rPaths["cnf"], "r") as rFile:
                if rFile.read(14) == "# Xtream Codes":
                    rCreate = False
        except OSError:
            pass

    if rCreate:
        try:
            shutil.copy(rPaths["cnf"], rPaths["cnfBackup"])
        except OSError:
            pass
        writeAndValidateCnf()
        runShell("systemctl daemon-reload")
        runShell("systemctl restart mysql")
        if runShell("systemctl is-active --quiet mysql") != 0:
            # Ubuntu ships mysql.service as an alias of mysqld.service on some builds
            runShell("systemctl restart mysqld")

    printc("Enter MySQL Root Password:", col.WARNING)
    for _i in range(5):
        rMySQLRoot = input("  ")
        print(" ")
        # MySQL 8 on Ubuntu authenticates root through auth_socket, so an empty
        # password is the normal case and no longer treated as a failure.
        rExtra = ""
        if len(rMySQLRoot) > 0:
            rExtra = " -p%s" % quote(rMySQLRoot)

        if mysqlQuery(["SELECT 1;"], rExtra) != 0:
            printc("Invalid password! Try again", col.FAIL)
            continue

        printc("Drop existing & create database? Y/N", col.WARNING)
        rDrop = input("  ").upper() == "Y"

        try:
            rIdent = (
                " IDENTIFIED WITH mysql_native_password BY %s" % quote(rPassword)
                if hasNativePasswordPlugin()
                else " IDENTIFIED BY %s" % quote(rPassword)
            )

            if rDrop:
                mysqlQuery(
                    [
                        "DROP USER IF EXISTS '%s'@'%%';" % rUsername,
                        "DROP USER IF EXISTS '%s'@'localhost';" % rUsername,
                        "DROP USER IF EXISTS '%s'@'127.0.0.1';" % rUsername,
                    ],
                    rExtra,
                )
                mysqlQuery(
                    [
                        "DROP DATABASE IF EXISTS xtream_iptvpro;",
                        "CREATE DATABASE IF NOT EXISTS xtream_iptvpro;",
                    ],
                    rExtra,
                )
                runShell(
                    "mysql --protocol=socket -S %s -u root%s xtream_iptvpro < %s"
                    % (quote(rMySQLSocket), rExtra, quote(rPaths["xc"] + "/database.sql"))
                )
                mysqlQuery(
                    [
                        "USE xtream_iptvpro;",
                        "UPDATE settings SET live_streaming_pass = '%s', unique_id = '%s', "
                        "crypt_load_balancing = '%s', get_real_ip_client='';"
                        % (generate(20), generate(12), generate(20)),
                    ],
                    rExtra,
                )
                mysqlQuery(
                    [
                        "USE xtream_iptvpro;",
                        "REPLACE INTO streaming_servers (id, server_name, domain_name, server_ip, "
                        "vpn_ip, ssh_password, ssh_port, diff_time_main, http_broadcast_port, "
                        "total_clients, system_os, network_interface, latency, status, enable_geoip, "
                        "geoip_countries, last_check_ago, can_delete, server_hardware, total_services, "
                        "persistent_connections, rtmp_port, geoip_type, isp_names, isp_type, enable_isp, "
                        "boost_fpm, http_ports_add, network_guaranteed_speed, https_broadcast_port, "
                        "https_ports_add, whitelist_ips, watchdog_data, timeshift_only) VALUES "
                        "(1, 'Main Server', '', '%s', '', NULL, NULL, 0, 8080, 1000, '%s', 'eth0', 0, 1, "
                        "0, '', 0, 0, '{}', 3, 0, 8880, 'low_priority', '', 'low_priority', 0, 1, '', "
                        "1000, 8443, '', '[\"127.0.0.1\",\"\"]', '{}', 0);" % (getIP(), getVersion()),
                    ],
                    rExtra,
                )
                # XPanel's local administrator is provisioned separately; no default panel account is seeded here.
                # MySQL 8 removed `GRANT ... IDENTIFIED BY`, so users are created first.
                for rHost in ["localhost", "127.0.0.1"]:
                    mysqlQuery(
                        [
                            "CREATE USER IF NOT EXISTS '%s'@'%s'%s;" % (rUsername, rHost, rIdent),
                            "GRANT ALL PRIVILEGES ON xtream_iptvpro.* TO '%s'@'%s' WITH GRANT OPTION;"
                            % (rUsername, rHost),
                            "GRANT SELECT, PROCESS, LOCK TABLES ON *.* TO '%s'@'%s';" % (rUsername, rHost),
                            "FLUSH PRIVILEGES;",
                        ],
                        rExtra,
                    )
                mysqlQuery(
                    [
                        "CREATE USER IF NOT EXISTS '%s'@'%%'%s;" % (rUsername, rIdent),
                        "GRANT SELECT, INSERT, UPDATE, DELETE ON xtream_iptvpro.* TO '%s'@'%%';" % rUsername,
                        "FLUSH PRIVILEGES;",
                    ],
                    rExtra,
                )
                mysqlQuery(
                    [
                        "USE xtream_iptvpro;",
                        "CREATE TABLE IF NOT EXISTS dashboard_statistics (id int(11) NOT NULL "
                        "AUTO_INCREMENT, type varchar(16) NOT NULL DEFAULT '', time int(16) NOT NULL "
                        "DEFAULT '0', count int(16) NOT NULL DEFAULT '0', PRIMARY KEY (id)) "
                        "ENGINE=InnoDB DEFAULT CHARSET=latin1;",
                        "INSERT INTO dashboard_statistics (type, time, count) "
                        "VALUES('conns', UNIX_TIMESTAMP(), 0),('users', UNIX_TIMESTAMP(), 0);",
                    ],
                    rExtra,
                )
                # last one is to prevent an xc vulnerability, run
                # "UPDATE settings SET get_real_ip_client='HTTP_CF_CONNECTING_IP' where id=1;"
                # query if you are using cf proxy.
                mysqlQuery(
                    [
                        "USE xtream_iptvpro;",
                        "UPDATE settings SET get_real_ip_client='', double_auth='1', hash_lb='1', "
                        "mag_security='1' where id='1';",
                    ],
                    rExtra,
                )

                if not os.path.exists(rPaths["jemallocEnv"]):
                    rJemallocPath = rJemalloc
                    if not glob.glob("/usr/lib/*/libjemalloc.so.2"):
                        rJemallocPath = "/usr/lib/x86_64-linux-gnu/libjemalloc.so.1"
                    with open(rPaths["jemallocEnv"], "w") as rFile:
                        rFile.write("LD_PRELOAD=%s\n" % rJemallocPath)
                    # Drop-in override instead of replacing the packaged unit file.
                    try:
                        os.makedirs(os.path.dirname(rPaths["serviceDropIn"]), exist_ok=True)
                    except OSError:
                        pass
                    with open(rPaths["serviceDropIn"], "w") as rFile:
                        rFile.write(rMySQLServiceFile)
                    runShell("systemctl daemon-reload")
                    runShell("systemctl restart mysql.service")
                    if runShell("systemctl is-active --quiet mysql") != 0:
                        runShell("systemctl restart mysqld.service")

            try:
                os.remove(rPaths["xc"] + "/database.sql")
            except OSError:
                pass
            return True
        except Exception as rError:
            printc("Invalid password! Try again (%s)" % rError, col.FAIL)
    return False


def encrypt(rHost="127.0.0.1", rUsername="user_iptvpro", rPassword="", rDatabase="xtream_iptvpro", rServerID=1, rPort=7999):
    printc("Encrypting...")
    try:
        os.remove(rPaths["config"])
    except OSError:
        pass

    # NOTE: the XOR key stays byte-for-byte identical to the original - the
    # closed source PHP/C binaries shipped in main.tar.gz decrypt it themselves.
    rPlain = '{"host":"%s","db_user":"%s","db_pass":"%s","db_name":"%s","server_id":"%d", "db_port":"%d", "pconnect":"0"}' % (
        rHost, rUsername, rPassword, rDatabase, int(rServerID), int(rPort),
    )
    rKey = "5709650b0d7806074842c6de575025b1"
    rXored = bytes(
        ord(rChar) ^ ord(rKeyChar)
        for rChar, rKeyChar in zip(rPlain, cycle(rKey))
    )
    with open(rPaths["config"], "wb") as rf:
        rf.write(base64.b64encode(rXored).replace(b"\n", b""))


def patchNginxConf():
    """adds domain/user/pass/id.ts url support"""
    rConf = rPaths["xc"] + "/nginx/conf/nginx.conf"
    rOldRule = "rewrite ^/(.*)/(.*)/(\\d+)$ /streaming/clients_live.php?username=$1&password=$2&stream=$3&extension=ts break;"
    rNewRules = (
        "rewrite ^/(.*)/(.*)/(\\d+)\\.(.*)$ /streaming/clients_live.php?username=$1&password=$2&stream=$3&extension=$4 break;\r\n"
        "        rewrite ^/(.*)/(.*)/(\\d+)$ /streaming/clients_live.php?username=$1&password=$2&stream=$3&extension=ts break;\r\n"
    )
    try:
        with open(rConf, "r") as nginx_file:
            nginx_replace = nginx_file.read()
        if rOldRule in nginx_replace and "extension=$4 break;" not in nginx_replace:
            nginx_replace = nginx_replace.replace(rOldRule, rNewRules)
            with open(rConf, "w") as nginx_file:
                nginx_file.write(nginx_replace)
    except OSError as rError:
        printc("Could not patch nginx.conf (%s)" % rError, col.WARNING)


def checkLibPNGCompat():
    """
    The prebuilt binaries were linked against libpng12.so.0 which no longer
    exists on supported Ubuntu releases. libpng16 is NOT ABI compatible with
    libpng12, so we detect and report instead of creating a bogus symlink.
    """
    rMissing = []
    for rBinary in glob.glob(rPaths["xc"] + "/bin/*") + glob.glob(rPaths["xc"] + "/nginx/sbin/*"):
        if not os.path.isfile(rBinary) or not os.access(rBinary, os.X_OK):
            continue
        try:
            rOutput = subprocess.check_output(
                ["ldd", rBinary], stderr=subprocess.DEVNULL
            ).decode("utf-8", "replace")
            if "libpng12.so.0 => not found" in rOutput:
                rMissing.append(os.path.basename(rBinary))
        except Exception:
            continue
    if rMissing:
        printc(
            "libpng12 needed by: %s - install the maintained libpng12-0 shim or rebuild them"
            % ", ".join(sorted(set(rMissing))),
            col.WARNING,
        )


def configure(rType="MAIN"):
    printc("Configuring System")

    if rPaths["xc"] + "/" not in open("/etc/fstab").read():
        with open("/etc/fstab", "a") as rFile:
            rFile.write(
                "tmpfs %s/streams tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=90%% 0 0\n"
                "tmpfs %s/tmp tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=3G 0 0\n"
                % (rPaths["xc"], rPaths["xc"])
            )

    # /etc/sudoers.d drop-in - editing /etc/sudoers directly is unsupported on
    # modern Ubuntu because a syntax error there locks you out of sudo entirely.
    if not os.path.exists(rPaths["sudoersDropIn"]):
        with open(rPaths["sudoersDropIn"], "w") as rFile:
            rFile.write(
                "xtreamcodes ALL = (root) NOPASSWD: /usr/sbin/iptables, /sbin/iptables, /usr/bin/chattr\n"
            )
        os.chmod(rPaths["sudoersDropIn"], 0o440)
        if runCommand(["visudo", "-c"]) != 0:
            printc("sudoers drop-in rejected by visudo, removing", col.FAIL)
            os.remove(rPaths["sudoersDropIn"])

    if not os.path.exists(rPaths["initd"]):
        with open(rPaths["initd"], "w") as rFile:
            rFile.write("#! /bin/bash\n%s/start_services.sh\n" % rPaths["xc"])
        os.chmod(rPaths["initd"], 0o755)

    # Native systemd unit (modern replacement for the @reboot crontab line).
    if not os.path.exists(rPaths["systemdUnit"]):
        with open(rPaths["systemdUnit"], "w") as rFile:
            rFile.write(
                "[Unit]\n"
                "Description=Xtream Codes Services\n"
                "After=network-online.target mysql.service\n"
                "Wants=network-online.target\n\n"
                "[Service]\n"
                "Type=oneshot\n"
                "RemainAfterExit=yes\n"
                "User=root\n"
                "ExecStart=%s/start_services.sh\n"
                "TimeoutStartSec=600\n\n"
                "[Install]\n"
                "WantedBy=multi-user.target\n" % rPaths["xc"]
            )
        runShell("systemctl daemon-reload")
        runShell("systemctl enable xtreamcodes.service")

    runShell("mount -a")
    try:
        os.remove("/usr/bin/ffmpeg")
    except OSError:
        pass
    if not os.path.exists(rPaths["xc"] + "/tv_archive"):
        os.mkdir(rPaths["xc"] + "/tv_archive/")
    runShell("ln -s %s/bin/ffmpeg /usr/bin/" % quote(rPaths["xc"]))
    runShell("chown xtreamcodes:xtreamcodes -R %s" % quote(rPaths["base"]))
    runShell("chmod -R u+rwX,go-w %s" % quote(rPaths["base"]))

    if rType == "MAIN":
        runShell("find %s/admin/ -type f -exec chmod 644 {} \\;" % quote(rPaths["xc"]))
        runShell("find %s/admin/ -type d -exec chmod 755 {} \\;" % quote(rPaths["xc"]))

    patchNginxConf()

    rBase = "https://github.com/emre1393/xtreamui_mirror/releases/latest/download/"
    download(rBase + "nginx", rPaths["xc"] + "/nginx/sbin/nginx")
    download(rBase + "nginx_rtmp", rPaths["xc"] + "/nginx_rtmp/sbin/nginx_rtmp")
    download(rBase + "pid_monitor.php", rPaths["xc"] + "/crons/pid_monitor.php")
    os.chmod(rPaths["xc"] + "/nginx/sbin/nginx", 0o755)
    os.chmod(rPaths["xc"] + "/nginx_rtmp/sbin/nginx_rtmp", 0o755)

    runShell("find %s/wwwdir/ -type f -exec chmod 644 {} \\;" % quote(rPaths["xc"]))
    runShell("find %s/wwwdir/ -type d -exec chmod 755 {} \\;" % quote(rPaths["xc"]))
    os.chmod(rPaths["config"], 0o700)

    # Anti-fingerprinting: redirect the web root to Google (unchanged behaviour).
    runShell(
        "sed -i 's|echo \"Xtream Codes Reborn\";|header(\"Location: https://www.google.com/\");|g' %s"
        % quote(rPaths["xc"] + "/wwwdir/index.php")
    )

    installGeoIP()
    checkLibPNGCompat()

    runShell(
        "sed -i 's|chown -R xtreamcodes:xtreamcodes /home/xtreamcodes|"
        "chown -R xtreamcodes:xtreamcodes /home/xtreamcodes 2>/dev/null|g' %s"
        % quote(rPaths["xc"] + "/start_services.sh")
    )
    os.chmod(rPaths["xc"] + "/start_services.sh", 0o755)

    for rHostEntry in ["xtream-codes.com", "api.xtream-codes.com", "downloads.xtream-codes.com"]:
        try:
            rHosts = open("/etc/hosts").read()
        except OSError:
            rHosts = ""
        # Still required: the binaries phone home for licence validation and the
        # official validation servers were seized in 2019.
        if rHostEntry not in rHosts:
            with open("/etc/hosts", "a") as rFile:
                rFile.write("127.0.0.1    %s\n" % rHostEntry)

    try:
        rCrontab = open("/etc/crontab").read()
    except OSError:
        rCrontab = ""
    if "@reboot root %s/start_services.sh" % rPaths["xc"] not in rCrontab:
        # Kept as a fallback for images without systemd; harmless duplicate.
        with open("/etc/crontab", "a") as rFile:
            rFile.write("@reboot root %s/start_services.sh\n" % rPaths["xc"])


def installGeoIP():
    """
    MaxMind killed anonymous direct downloads of GeoLite2 in December 2019
    (GDPR / CCPA). When MAXMIND_LICENSE_KEY is exported we use the official
    geoipupdate feed, otherwise we fall back to the mirror release asset so the
    installer keeps working offline exactly like before.
    """
    rLicenseKey = os.environ.get("MAXMIND_LICENSE_KEY", "").strip()
    if rLicenseKey:
        printc("Updating GeoLite2 via official geoipupdate feed")
        if installPackage("geoipupdate"):
            with open("/etc/GeoIP.conf", "w") as rFile:
                rFile.write(
                    "LicenseKey %s\nUserId 999999\nDatabaseDirectory %s\nEditionIDs GeoLite2-Country GeoLite2-City\n"
                    % (rLicenseKey, rPaths["xc"])
                )
            runCommand(["geoipupdate", "-v", "-f", "/etc/GeoIP.conf"])
            if os.path.exists(rPaths["geoip"]):
                runShell("chattr -f +i %s" % quote(rPaths["geoip"]))
                return True

    printc("Downloading GeoLite2.mmdb from mirror release")
    if download(
        "https://github.com/emre1393/xtreamui_mirror/releases/latest/download/GeoLite2.mmdb",
        rPaths["geoip"],
    ):
        runShell("chattr -f +i %s" % quote(rPaths["geoip"]))
        return True

    printc("GeoLite2.mmdb download failed, GeoIP filtering will be disabled", col.WARNING)
    return False


def start(first=True):
    if first:
        printc("Starting Xtream Codes")
    else:
        printc("Restarting Xtream Codes")
    runShell("systemctl start xtreamcodes.service", rQuiet=False)
    if runShell("systemctl is-active --quiet xtreamcodes.service") != 0:
        runShell("%s/start_services.sh" % quote(rPaths["xc"]))


def parse_xpanel_cli(argv=None):
    parser = argparse.ArgumentParser(description='XPanel: verify or deploy xpanel.zip from a local file or a public GitHub Release.')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check-xpanel', action='store_true', help='Validate the archive without installing or changing files.')
    mode.add_argument('--xpanel-only', action='store_true', help='Deploy the panel files only, without installing legacy services.')
    source = parser.add_argument_group('Package source')
    origin = source.add_mutually_exclusive_group()
    origin.add_argument('--xpanel-zip', metavar='PATH', help='Use a local ZIP (or set XPANEL_ZIP).')
    origin.add_argument('--github-repo', metavar='billelaggab/xpanel_main', help='Download xpanel.zip from GitHub Releases (or set XPANEL_GITHUB_REPO).')
    source.add_argument('--release-tag', metavar='TAG', help='Specify a release tag instead of latest (or set XPANEL_GITHUB_TAG).')
    source.add_argument('--sha256', metavar='HASH', help='Expected SHA-256, required for GitHub (or set XPANEL_SHA256).')
    target = parser.add_argument_group('Panel-only deployment')
    target.add_argument('--target', metavar='DIR', help='Deployment root; required with --xpanel-only.')
    target.add_argument('--state-dir', metavar='DIR', help='Private storage outside the web root; required with --xpanel-only.')
    target.add_argument('--web-group', help='PHP-FPM process group, if different from the installing user.')
    target.add_argument('--access-code', help='Optional prefix for the Nginx route.')
    target.add_argument('--username', help='Initial XPanel username.')
    target.add_argument('--rotate-password', action='store_true', help='Replace previously configured credentials.')
    target.add_argument('--replace-admin', action='store_true', help='Allow replacement of an existing admin directory.')
    args = parser.parse_args(argv)
    if args.xpanel_only and not (args.target and args.state_dir):
        parser.error('--xpanel-only requires --target and --state-dir.')
    if not args.xpanel_only and any((args.target, args.state_dir, args.web_group, args.access_code, args.username, args.rotate_password, args.replace_admin)):
        parser.error('Deployment options require --xpanel-only.')
    return args


def panel_only(args):
    target = _path(args.target)
    state = _path(args.state_dir)
    if (target / 'admin').exists() and not args.replace_admin:
        raise ValueError('يوجد مجلد admin قائم. خذ نسخة احتياطية ثم استخدم --replace-admin.')
    bundle = load_xpanel(args)
    credentials = read_credentials(state, args.username, args.rotate_password)
    route = deploy_xpanel(target, state, args.access_code or secrets.token_urlsafe(15), args.web_group, credentials, bundle.files)
    print('تم تجهيز ملفات XPanel: ' + str(target / 'admin'))
    print('مسار اللوحة في إعداد Nginx: ' + route)


if __name__ == "__main__":
    rArgs = parse_xpanel_cli()
    if rArgs.check_xpanel or rArgs.xpanel_only:
        try:
            if rArgs.check_xpanel:
                bundle = load_xpanel(rArgs)
                check = 'matched expected SHA-256' if bundle.compared else 'no expected SHA-256 supplied'
                print('XPanel: validated %d files in xpanel.zip (%s).' % (len(bundle.files), check))
                print('Source: ' + bundle.source)
                print('SHA-256: ' + bundle.sha256)
            else:
                panel_only(rArgs)
        except (OSError, ValueError, KeyError, EOFError, KeyboardInterrupt) as rError:
            sys.exit('XPanel: %s' % (str(rError) or 'تم إلغاء العملية.'))
        sys.exit(0)

    if os.geteuid() != 0:
        printc("Please run this installer as root (sudo ./install.py)", col.FAIL)
        sys.exit(1)

    rVersion = getVersionShort()
    if rVersion not in rVersions:
        printc("Unsupported Operating System, Works only on Ubuntu Server 20.04, 22.04 and 24.04")
        sys.exit(1)

    printc("Xtream UI - Installer Mirror", col.OKGREEN, 2)
    print("%s │ Check out the mirror repo: https://bitbucket.org/emre1393/xtreamui_mirror %s" % (col.OKGREEN, col.ENDC))
    print("%s │ Modernized build: Python 3 + Ubuntu 20.04 / 22.04 / 24.04 %s" % (col.OKGREEN, col.ENDC))
    print(" ")
    rType = input("  Installation Type [MAIN, LB]: ")
    print(" ")

    if rType.upper() in ["MAIN", "LB"]:
        rAccesscode = ""
        if rType.upper() == "LB":
            rHost = input("  Main Server IP Address: ")
            rPassword = input("  MySQL Password: ")
            try:
                rServerID = int(input("  Load Balancer Server ID: "))
            except ValueError:
                rServerID = -1
            print(" ")
        else:
            rHost = "127.0.0.1"
            rPassword = generate()
            rServerID = 1
            rAccesscode = generate(12)

        rUsername = "user_iptvpro"
        rDatabase = "xtream_iptvpro"
        rPort = 7999

        if len(rHost) > 0 and len(rPassword) > 0 and rServerID > -1:
            printc("Start installation? Y/N", col.WARNING)
            if input("  ").upper() == "Y":
                print(" ")
                rIsMain = rType.upper() == "MAIN"
                if rIsMain:
                    try:
                        rPanelBundle = load_xpanel(rArgs)
                        rPanelCredentials = read_credentials(XPANEL_STATE)
                    except (OSError, ValueError, KeyError, EOFError, KeyboardInterrupt) as rError:
                        sys.exit('XPanel: %s. Use --check-xpanel to verify xpanel.zip.' % (str(rError) or 'تم إلغاء العملية.'))
                prepare(rType.upper())
                if not install(rType.upper()):
                    sys.exit(1)
                if rIsMain and not mysql(rUsername, rPassword):
                    sys.exit(1)
                encrypt(rHost, rUsername, rPassword, rDatabase, rServerID, rPort)
                configure(rType.upper())
                if rIsMain:
                    rPanelPath = installadminpanel(rAccesscode, rPanelCredentials, rPanelBundle)
                    if not rPanelPath:
                        sys.exit(1)
                start()
                printc("Installation completed!", col.OKGREEN, 2)
                if rIsMain:
                    printc("Please store your MySQL password!")
                    printc(rPassword)
                    print("XPanel (local access): http://127.0.0.1:8080%s" % rPanelPath)
            else:
                printc("Installation cancelled", col.FAIL)
        else:
            printc("Invalid entries", col.FAIL)
    else:
        printc("Invalid installation type", col.FAIL)
