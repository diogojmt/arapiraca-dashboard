const admin = require('firebase-admin');

// Carrega as credenciais a partir da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'arrecadacao-arapiraca.appspot.com'
});

const bucket = admin.storage().bucket();

exports.handler = async function(event, context) {
    if (event.httpMethod === 'GET') {
        try {
            const [files] = await bucket.getFiles({ prefix: 'uploads/' });
            const fileDetails = await Promise.all(files.map(async (file) => {
                const [metadata] = await file.getMetadata();
                return {
                    name: file.name,
                    size: metadata.size // Tamanho do arquivo em bytes
                };
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({ files: fileDetails })
            };
        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Erro ao listar arquivos.' })
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Método não permitido' })
    };
};
