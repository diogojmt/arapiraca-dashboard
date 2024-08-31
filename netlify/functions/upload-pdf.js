const admin = require('firebase-admin');
const serviceAccount = require('./path/to/your-service-account-file.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'arrecadacao-arapiraca.appspot.com'  // Substitua com o ID real do seu projeto
});

const bucket = admin.storage().bucket();

exports.handler = async function(event, context) {
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);
        const fileBuffer = Buffer.from(data.fileContent, 'base64');

        const file = bucket.file(data.fileName);
        await file.save(fileBuffer, {
            metadata: { contentType: 'application/pdf' }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Upload bem-sucedido!' })
        };
    }

    return {
        statusCode: 405,
        body: 'Método não permitido'
    };
};
