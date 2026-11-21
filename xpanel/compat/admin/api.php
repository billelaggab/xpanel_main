<?php
require __DIR__ . '/bootstrap.php';
xp_headers();
xp_session();
if (empty($_SESSION['xp_authenticated']) || !xp_auth_settings()) xp_json(array('error' => 'سجّل الدخول أولًا.'), 401);

class XPInvalid extends RuntimeException {}
function xp_text_field($input, $key, $max) {
    $value = isset($input[$key]) && is_string($input[$key]) ? trim($input[$key]) : '';
    if ($value === '' || strlen($value) > $max * 4 || !preg_match('/\A[^\x00-\x1f\x7f]{1,' . $max . '}\z/u', $value)) {
        throw new XPInvalid('تحقق من الحقول المطلوبة وأطوالها.', 400);
    }
    return $value;
}
function xp_choice($input, $key, $options) {
    $value = xp_text_field($input, $key, 35);
    if (!in_array($value, $options, true)) throw new XPInvalid('أحد الخيارات غير صالح.', 400);
    return $value;
}
function xp_number($input, $key, $max, $integer = false) {
    $value = isset($input[$key]) ? $input[$key] : null;
    if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value) || $value < 0 || $value > $max || ($integer && floor($value) != $value)) {
        throw new XPInvalid('أدخل قيمة رقمية ضمن النطاق المسموح.', 400);
    }
    return $integer ? (int) $value : $value;
}
function xp_entry($entity, $input, $previous) {
    if (!is_array($input)) throw new XPInvalid('البيانات غير صالحة.', 400);
    $shared = array('id' => $previous ? $previous['id'] : bin2hex(random_bytes(16)), 'createdAt' => $previous ? $previous['createdAt'] : gmdate('c'), 'name' => xp_text_field($input, 'name', 80));
    if ($entity === 'channels') {
        $status = xp_choice($input, 'status', array('live', 'paused', 'scheduled'));
        $viewers = xp_number($input, 'viewers', 10000000, true);
        return $shared + array('category' => xp_choice($input, 'category', array('sports', 'news', 'entertainment', 'documentary', 'kids', 'music')), 'quality' => xp_choice($input, 'quality', array('4K', '1080p', '720p', '480p')), 'status' => $status, 'viewers' => $status === 'live' ? $viewers : 0);
    }
    if ($entity === 'subscribers') {
        $email = strtolower(xp_text_field($input, 'email', 254));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new XPInvalid('البريد الإلكتروني غير صالح.', 400);
        return $shared + array('email' => $email, 'plan' => xp_choice($input, 'plan', array('monthly', 'quarterly', 'annual')), 'status' => xp_choice($input, 'status', array('active', 'trial', 'expired')));
    }
    return $shared + array('region' => xp_text_field($input, 'region', 80), 'status' => xp_choice($input, 'status', array('online', 'busy', 'offline')), 'load' => xp_number($input, 'load', 100, true), 'traffic' => xp_number($input, 'traffic', 1000));
}
function xp_update($current, $request) {
    $entity = isset($request['entity']) ? $request['entity'] : null;
    $action = isset($request['action']) ? $request['action'] : null;
    if (!in_array($entity, array('channels', 'subscribers', 'servers'), true) || !in_array($action, array('create', 'update', 'delete'), true)) {
        throw new XPInvalid('العملية غير صالحة.', 400);
    }
    $id = isset($request['id']) ? $request['id'] : null;
    $index = null;
    foreach ($current[$entity] as $i => $row) if ($row['id'] === $id) { $index = $i; break; }
    if ($action !== 'create' && $index === null) throw new XPInvalid('لم يعد هذا السجل موجودًا.', 404);
    if ($action === 'create' && count($current[$entity]) >= 1000) throw new XPInvalid('بلغت مساحة العمل الحد الأقصى لهذا النوع.', 409);
    if ($action === 'delete') {
        array_splice($current[$entity], $index, 1);
    } else {
        $raw = isset($request['data']) ? $request['data'] : null;
        $item = xp_entry($entity, $raw, $action === 'update' ? $current[$entity][$index] : null);
        if ($entity === 'subscribers') {
            foreach ($current[$entity] as $row) {
                if ($row['id'] !== $item['id'] && $row['email'] === $item['email']) throw new XPInvalid('البريد الإلكتروني مسجل بالفعل.', 409);
            }
        }
        if ($action === 'update') $current[$entity][$index] = $item;
        else array_unshift($current[$entity], $item);
    }
    if ($entity === 'channels') {
        $today = gmdate('Y-m-d');
        $viewers = 0;
        foreach ($current['channels'] as $channel) if ($channel['status'] === 'live') $viewers += $channel['viewers'];
        $history = array_slice(array_values(array_filter($current['history'], function ($point) use ($today) { return $point['date'] !== $today; })), -29);
        $history[] = array('date' => $today, 'audience' => $viewers);
        $current['history'] = $history;
    }
    return $current;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    xp_json(array('error' => 'العملية غير مسموحة.'), 405);
}
if ($method === 'POST') {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $header = isset($_SERVER['HTTP_X_XPANEL_REQUEST']) ? $_SERVER['HTTP_X_XPANEL_REQUEST'] : '';
    $token = isset($_SERVER['HTTP_X_XPANEL_CSRF']) ? $_SERVER['HTTP_X_XPANEL_CSRF'] : '';
    if (stripos($contentType, 'application/json') !== 0 || $header !== 'workspace' || !xp_csrf($token)) xp_json(array('error' => 'الطلب غير مسموح.'), 403);
}
session_write_close();

try {
    if ($method === 'GET') {
        xp_json(xp_locked('workspace', false, function ($file) { return xp_read($file) ?: xp_empty(); }));
    }
    $body = file_get_contents('php://input', false, null, 0, 4097);
    if ($body === false || strlen($body) > 4096) throw new XPInvalid('حجم الطلب أكبر من المسموح.', 413);
    $input = json_decode($body, true);
    if (!is_array($input)) throw new XPInvalid('صيغة الطلب غير صالحة.', 400);
    $snapshot = xp_locked('workspace', true, function ($file) use ($input) {
        $updated = xp_update(xp_read($file) ?: xp_empty(), $input);
        xp_write($file, $updated);
        return $updated;
    });
    xp_json($snapshot);
} catch (XPInvalid $error) {
    xp_json(array('error' => $error->getMessage()), $error->getCode());
} catch (Exception $error) {
    error_log('XPanel snapshot unavailable');
    xp_json(array('error' => 'تعذر الوصول إلى مساحة العمل.'), 503);
}
