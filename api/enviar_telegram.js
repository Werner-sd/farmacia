export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    try {
        const { mensaje } = req.body;

        if (!mensaje || mensaje.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'El mensaje no puede estar vacío.' });
        }

        const TELEGRAM_TOKEN = '8248425848:AAHkTXO1sqb5fvUDssss8wipMOjlbw5D-YI'; 
        const TELEGRAM_CHAT_ID = '1188278487'; 

        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensaje
            })
        });

        const data = await response.json();

        if (data.ok) {
            return res.status(200).json({ status: 'success', message: 'Mensaje enviado con éxito' });
        } else {
            return res.status(400).json({ status: 'error', message: data.description || 'Error al enviar a Telegram' });
        }

    } catch (error) {
        console.error('Error Serverless:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
}