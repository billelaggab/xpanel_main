<?php
require __DIR__ . '/bootstrap.php';
xp_headers();
xp_session();
$auth = xp_auth_settings();
$notice = $auth ? '' : 'إعداد تسجيل الدخول غير متوفر. تحقّق من إعداد XPanel على الخادم.';
if (!$auth) http_response_code(503);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    $token = isset($_POST['csrf']) ? $_POST['csrf'] : '';
    if (!xp_csrf($token)) {
        http_response_code(403);
        $notice = 'انتهت صلاحية النموذج. أعد تحميل الصفحة.';
    } elseif ($action === 'logout') {
        $_SESSION = array();
        session_regenerate_id(true);
        header('Location: index.php', true, 303);
        exit;
    } elseif ($action === 'login' && $auth && empty($_SESSION['xp_authenticated'])) {
        try {
            $user = isset($_POST['username']) ? $_POST['username'] : '';
            $password = isset($_POST['password']) ? $_POST['password'] : '';
            if (xp_verify_login($auth, $user, $password)) {
                session_regenerate_id(true);
                $_SESSION = array('xp_csrf' => bin2hex(random_bytes(32)), 'xp_authenticated' => true, 'xp_started' => time(), 'xp_last' => time());
                header('Location: index.php', true, 303);
                exit;
            }
            http_response_code(401);
            $notice = 'بيانات الدخول غير صحيحة أو تجاوزت عدد المحاولات. حاول بعد بضع دقائق.';
        } catch (Exception $error) {
            error_log('XPanel login store unavailable');
            http_response_code(503);
            $notice = 'تسجيل الدخول غير متاح حاليًا.';
        }
    }
}
$loggedIn = $auth && !empty($_SESSION['xp_authenticated']);
$csrf = $_SESSION['xp_csrf'];
session_write_close();
?><!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>XPanel — إدارة البث</title>
<link rel="stylesheet" href="assets/app.css">
<style>body{margin:0} *{box-sizing:border-box}</style>
<?php if ($loggedIn): ?><script defer src="assets/app.js"></script><?php endif; ?>
</head>
<body>
<?php if ($loggedIn): ?>
<div id="xpanel-root" data-csrf="<?= xp_html($csrf) ?>" data-today="<?= gmdate('c') ?>"></div>
<noscript>يلزم تفعيل JavaScript لعرض لوحة XPanel.</noscript>
<?php else: ?>
<main class="xp xp-auth"><div class="xp-auth-box">
<section class="xp-auth-form">
<div class="xp-brand"><span class="xp-logo-mark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M8.7 8.7a4.7 4.7 0 0 0 0 6.6m6.6 0a4.7 4.7 0 0 0 0-6.6M5.5 5.5a9.2 9.2 0 0 0 0 13m13 0a9.2 9.2 0 0 0 0-13"/></svg></span><span><bdi class="xp-wordmark">xpanel<span>.</span></bdi><small>إدارة البث</small></span></div>
<h1>تسجيل الدخول</h1><p>ادخل إلى مساحة العمل الخاصة بك.</p>
<?php if ($notice): ?><p class="xp-error" role="alert"><?= xp_html($notice) ?></p><?php endif; ?>
<?php if ($auth): ?><form method="post" action="index.php">
<input type="hidden" name="action" value="login"><input type="hidden" name="csrf" value="<?= xp_html($csrf) ?>">
<label class="xp-field"><span>اسم المستخدم</span><input type="text" name="username" dir="ltr" maxlength="100" autocomplete="username" required></label>
<label class="xp-field"><span>كلمة المرور</span><input type="password" name="password" maxlength="256" dir="ltr" autocomplete="current-password" required></label>
<button class="xp-button primary" type="submit">دخول إلى اللوحة</button>
</form><?php endif; ?>
</section>
<aside class="xp-auth-aside"><span class="xp-hero-tag"><span class="xp-pulse"></span> مساحة عمل خاصة</span><h2>مركز عمليات البث</h2><p>أدر القنوات والمشتركين والخوادم في لوحة عربية واحدة.</p></aside>
</div></main>
<?php endif; ?>
</body>
</html>
