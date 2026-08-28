const fs = require('fs');

const backupPath = '/home/node/.n8n/workflows_backup.json';
const updatedPath = '/home/node/.n8n/workflows_updated.json';

try {
  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const workflow = data[0];

  // Modificar nodo existente (Send a message) para enviar al email del alumno
  const sendStudentNode = workflow.nodes.find(n => n.name === 'Send a message');
  if (sendStudentNode) {
    sendStudentNode.parameters.sendTo = '={{ $json.body.email }}';
  }

  // Crear nodo IF (v2.3)
  const ifNode = {
    "parameters": {
      "conditions": {
        "boolean": [
          {
            "value1": "={{ !!$json.body.parent }}",
            "value2": true
          }
        ]
      }
    },
    "id": "new-if-node",
    "name": "Check Parent",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.3,
    "position": [440, 0]
  };

  // Crear nodo Gmail para Padre
  const parentEmailHtml = `<!DOCTYPE html> <html> <head>   <meta charset="utf-8">   <style>     body {       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;       background-color: #f3f4f6;       margin: 0;       padding: 40px 20px;     }     .email-container {       max-width: 600px;       margin: 0 auto;       background-color: #ffffff;       border-radius: 12px;       overflow: hidden;       box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);     }     .header {       background-color: #22c55e;       padding: 30px 20px;       text-align: center;       color: #ffffff;     }     .header h1 {       margin: 0;       font-size: 28px;       font-weight: 700;     }     .content {       padding: 30px;       color: #374151;       line-height: 1.6;     }     .credentials-box {       background-color: #f0fdf4;       border: 1px solid #bbf7d0;       border-radius: 8px;       padding: 20px;       margin: 20px 0;     }     .credentials-box p {       margin: 5px 0;       font-size: 16px;     }     .credentials-box strong {       color: #166534;     }     .button-container {       text-align: center;       margin: 30px 0;     }     .btn {       background-color: #22c55e;       color: #ffffff !important;       text-decoration: none;       padding: 12px 24px;       border-radius: 6px;       font-weight: bold;       font-size: 16px;       display: inline-block;     }     .footer {       background-color: #f9fafb;       padding: 20px;       text-align: center;       color: #9ca3af;       font-size: 14px;       border-top: 1px solid #e5e7eb;     }   </style> </head> <body>   <div class="email-container">     <div class="header">       <h1>¡Bienvenido a HitSchool Familiar! 👨‍👩‍👧</h1>     </div>          <div class="content">       <p>Hola <strong>{{ $('Webhook').item.json.body.parent.name }}</strong>,</p>       <p>Se ha dado de alta a tu hijo/a <strong>{{ $('Webhook').item.json.body.firstName }} {{ $('Webhook').item.json.body.lastName }}</strong> en HitSchool y se te ha asignado como tutor responsable de su cuenta.</p>              <div class="credentials-box">         <p style="margin-bottom: 10px; font-weight: bold; color: #166534;">Tus Credenciales de Acceso (Portal de Padres):</p>         <p>Usuario: <strong>{{ $('Webhook').item.json.body.parent.email }}</strong></p>         <p>Contraseña temporal: <strong>{{ $('Webhook').item.json.body.parent.generatedPassword }}</strong></p>       </div>        <p>Desde el portal de padres podrás hacer el seguimiento de sus calificaciones y gestionar los pagos de mensualidades de forma sencilla.</p>        <div class="button-container">         <a href="http://localhost:5173" class="btn">Entrar al Portal de Padres</a>       </div>              <p>¡Gracias por confiar en nosotros!</p>     </div>          <div class="footer">       <p>© 2026 HitSchool. Todos los derechos reservados.</p>     </div>   </div> </body> </html>`;

  const sendParentNode = {
    "parameters": {
      "sendTo": "={{ $('Webhook').item.json.body.parent.email }}",
      "subject": "=Bienvenido a HitSchool Familiar - Credenciales de Acceso",
      "message": `=${parentEmailHtml}`,
      "options": {}
    },
    "id": "new-gmail-parent",
    "name": "Send to Parent",
    "type": "n8n-nodes-base.gmail",
    "typeVersion": 2.2,
    "position": [660, 0],
    "credentials": sendStudentNode ? sendStudentNode.credentials : {}
  };

  workflow.nodes.push(ifNode);
  workflow.nodes.push(sendParentNode);

  // Actualizar conexiones de forma estricta y absoluta
  workflow.connections = {
    "Webhook": {
      "main": [
        [
          {
            "node": "Send a message",
            "type": "main",
            "index": 0
          },
          {
            "node": "Check Parent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Parent": {
      "main": [
        [
          {
            "node": "Send to Parent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  };

  // Generar un nuevo ID de workflow para evitar problemas al importar (si se importa sobre el mismo)
  // O podemos mantener el mismo para sobreescribir. Vamos a sobreescribir.
  
  fs.writeFileSync(updatedPath, JSON.stringify([workflow], null, 2));
  console.log("JSON de n8n actualizado correctamente en", updatedPath);
} catch(e) {
  console.error("Error", e);
}
