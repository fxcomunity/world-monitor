<?php
declare(strict_types=1);

$host = strtolower((string) preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$remoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';
$allowedHosts = ['localhost', '127.0.0.1', 'exploreid.test'];
$allowedAddresses = ['127.0.0.1', '::1'];

header('Content-Type: application/json');

if (!in_array($host, $allowedHosts, true) || !in_array($remoteAddress, $allowedAddresses, true)) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

$path = $_GET['__path'] ?? null;
if ($path === null) {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (is_string($requestPath) && preg_match('~^/api/(.+)$~', $requestPath, $matches)) {
        $path = $matches[1];
    }
}
if (!is_string($path) || !preg_match('~^[a-zA-Z0-9/_-]+$~', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid API path']);
    exit;
}

$query = $_GET;
unset($query['__path']);
$url = 'http://127.0.0.1:8787/api/' . $path;
if ($query !== []) {
    $url .= '?' . http_build_query($query);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (!in_array($method, ['GET', 'POST', 'OPTIONS'], true)) {
    http_response_code(405);
    header('Allow: GET, POST, OPTIONS');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$requestHeaders = ['Accept: application/json'];
if (!empty($_SERVER['CONTENT_TYPE'])) {
    $requestHeaders[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}
if (!empty($_SERVER['HTTP_COOKIE'])) {
    $requestHeaders[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
}

$responseHeaders = [];
$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $requestHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
        $length = strlen($line);
        $parts = explode(':', $line, 2);
        if (count($parts) === 2) {
            $name = strtolower(trim($parts[0]));
            $value = trim($parts[1]);
            if ($name === 'set-cookie') {
                $responseHeaders[$name][] = $value;
            } elseif (in_array($name, ['content-type', 'cache-control'], true)) {
                $responseHeaders[$name] = $value;
            }
        }
        return $length;
    },
]);

if ($method === 'POST') {
    curl_setopt($curl, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$body = curl_exec($curl);
$curlError = curl_error($curl);
$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

if ($body === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Worker lokal tidak tersedia. Jalankan Wrangler pada port 8787.', 'detail' => $curlError]);
    exit;
}

http_response_code($status);
foreach ($responseHeaders as $name => $value) {
    if ($name === 'set-cookie') {
        foreach ($value as $cookie) {
            header('Set-Cookie: ' . $cookie, false);
        }
    } else {
        header($name . ': ' . $value);
    }
}
echo $body;
