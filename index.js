const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Ruta GET para la verificación del webhook
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "primer-bot"; // El mismo token que usas en la configuración de Webhook
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    res.status(200).send(challenge); // Devuelve el desafío de verificación
  } else {
    console.log("Verificación fallida");
    res.sendStatus(403); // Error de verificación
  }
});


// RUTA PARA EL WEBHOOK DE WHATSAPP
app.post("/webhook", async (req, res) => {
  console.log("Cuerpo del mensaje recibido:", req.body);  // Verifica la estructura completa
  const VERIFY_TOKEN = "primer-bot";
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Verificación exitosa");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);  // Unauthorized
    }
    return;
  }

  const message = req.body.entry && req.body.entry[0].changes[0].value.messages[0]; // Revisa esta parte
  if (message) {
    const from = message.from;  // Número de teléfono del remitente
    const text = message.text.body.toLowerCase();  // Texto del mensaje

    console.log(`Mensaje recibido de ${from}: ${text}`);

    if (text === "activar") {
      // Enviar comando al ESP32
      try {
        await axios.get("http://<IP_DE_TU_ESP32>/activar");
        await sendMessage(from, "El dispensador fue activado.");
      } catch (error) {
        console.error("Error activando el dispensador:", error.message);
        await sendMessage(from, "Hubo un problema al activar el dispensador.");
      }
    } else {
      await sendMessage(from, "Comando no reconocido. Escribe 'activar'.");
    }
  }
  res.sendStatus(200);
});


// FUNCIÓN PARA ENVIAR MENSAJES
async function sendMessage(to, text) {
  const url = `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const token = process.env.ACCESS_TOKEN;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error enviando mensaje:", error.message);
  }
}

// INICIAR EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
