<?php
// Permitir que el archivo devuelva JSON
header('Content-Type: application/json');

// 1. Obtener los datos enviados en formato JSON desde JavaScript
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Verificar que el mensaje no esté vacío
if (isset($input['mensaje']) && !empty($input['mensaje'])) {
    $mensaje = $input['mensaje'];

    // 2. Credenciales del bot de la Farmacia
    $token   = "8807048425:AAHFrU80n6HOZOq_JRmvmVv-vAtVX-6fEnM"; 
    $chatId  = "5537628811";

    // Formatear el mensaje que llegará a Telegram
    $textoFinal = "💊 *¡Nuevo mensaje desde la web de FARMACIA!*\n\nMensaje: " . $mensaje;

    // 3. Preparar la URL de la API de Telegram
    $url = "https://api.telegram.org/bot{$token}/sendMessage";

    // 4. Configurar los datos a enviar
    $data = [
        'chat_id' => $chatId,
        'text'    => $textoFinal,
        'parse_mode' => 'Markdown'
    ];

    // 5. Usar cURL con la misma estructura de Zapatería
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    $response = curl_exec($ch);
    
    // Obtener el código de respuesta HTTP
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // 6. Responder al frontend dependiendo del éxito
    if ($httpCode == 200) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error de conexión con la API']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'El mensaje está vacío']);
}
?>