<?php
/** XPanel's local storage and session boundary. No dependency on the legacy database. */
if (PHP_VERSION_ID < 70000) {
    http_response_code(503);
    exit('XPanel requires PHP 7.0 or newer. Use a supported PHP release.');
}

function xp_settings_path() {
    $configured = getenv('XPANEL_STATE_DIR');
    return $configured ? rtrim($configured, '/') : '/var/lib/xpanel';
}

function xp_headers() {
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}

function xp_session() {
    $script = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/index.php';
    $dir = str_replace('\\', '/', dirname($script));
    $path = preg_match('~^/[a-zA-Z0-9/_-]*$~D', $dir) ? rtrim($dir, '/') . '/' : '/';
    $secure = !empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off';
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('XPANELSID');
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params(array('lifetime' => 0, 'path' => $path, 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict'));
    } else {
        session_set_cookie_params(0, $path, '', $secure, true);
    }
    if (!session_start()) {
        http_response_code(503);
        exit('XPanel session unavailable.');
    }
    if (isset($_SESSION['xp_authenticated']) && (time() - (int) $_SESSION['xp_last'] > 1800 || time() - (int) $_SESSION['xp_started'] > 43200)) {
        $_SESSION = array();
        session_regenerate_id(true);
    }
    if (empty($_SESSION['xp_csrf'])) $_SESSION['xp_csrf'] = bin2hex(random_bytes(32));
    if (!empty($_SESSION['xp_authenticated'])) $_SESSION['xp_last'] = time();
}

function xp_csrf($token) {
    return is_string($token) && strlen($token) === 64 && hash_equals($_SESSION['xp_csrf'], $token);
}

function xp_auth_settings() {
    $path = xp_settings_path() . '/auth.json';
    if (!is_readable($path) || is_link($path) || filesize($path) > 4096) return null;
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data) || !isset($data['username'], $data['salt'], $data['digest'], $data['iterations']) ||
        !is_string($data['username']) || !is_string($data['salt']) || !is_string($data['digest']) ||
        !preg_match('/^[a-f0-9]{32}$/D', $data['salt']) || !preg_match('/^[a-f0-9]{64}$/D', $data['digest']) ||
        !is_int($data['iterations']) || $data['iterations'] < 200000 || $data['iterations'] > 1000000) return null;
    return $data;
}

function xp_read($file, $limit = 2000000) {
    if (!is_file($file)) return null;
    $raw = file_get_contents($file, false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) throw new RuntimeException('Invalid local store.');
    $obj = json_decode($raw, true);
    if (!is_array($obj)) throw new RuntimeException('Invalid local store.');
    return $obj;
}

function xp_write($file, $data) {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > 2000000) throw new RuntimeException('Invalid snapshot.');
    $temp = tempnam(dirname($file), '.xpanel-');
    if ($temp === false) throw new RuntimeException('Local store unavailable.');
    try {
        if (file_put_contents($temp, $json) !== strlen($json) || !chmod($temp, 0660) || !rename($temp, $file)) {
            throw new RuntimeException('Local store unavailable.');
        }
    } finally {
        if (is_file($temp)) unlink($temp);
    }
}

function xp_locked($name, $write, $callback) {
    $path = xp_settings_path() . '/data';
    if (!is_dir($path)) throw new RuntimeException('Local store unavailable.');
    $lock = fopen($path . '/' . $name . '.lock', 'c');
    if ($lock === false) throw new RuntimeException('Local store unavailable.');
    try {
        if (!flock($lock, $write ? LOCK_EX : LOCK_SH)) throw new RuntimeException('Local store unavailable.');
        return call_user_func($callback, $path . '/' . $name . '.json');
    } finally {
        fclose($lock);
    }
}

function xp_verify_login($settings, $username, $password) {
    if (!is_string($username) || !is_string($password) || strlen($username) > 100 || strlen($password) > 256) return false;
    return xp_locked('login', true, function ($file) use ($settings, $username, $password) {
        $attempts = xp_read($file, 4096);
        $now = time();
        if (!$attempts || !isset($attempts['start'], $attempts['count']) || $now - $attempts['start'] >= 300) $attempts = array('start' => $now, 'count' => 0);
        if ($attempts['count'] >= 10) return false;
        $digest = hash_pbkdf2('sha256', $password, hex2bin($settings['salt']), $settings['iterations'], 64);
        $valid = hash_equals($settings['digest'], $digest) && hash_equals($settings['username'], $username);
        $attempts['count'] = $valid ? 0 : $attempts['count'] + 1;
        xp_write($file, $attempts);
        return $valid;
    });
}

function xp_html($value) { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function xp_json($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function xp_empty() { return array('channels' => array(), 'subscribers' => array(), 'servers' => array(), 'history' => array()); }
