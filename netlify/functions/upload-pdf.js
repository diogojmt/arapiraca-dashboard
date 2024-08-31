const admin = require('firebase-admin');

// Carrega as credenciais a partir da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'arrecadacao-arapiraca.appspot.com'  // Substitua com o ID real do seu projeto
});

// Obtém uma referência ao bucket de armazenamento
const bucket = admin.storage().bucket();

// Função serverless exportada
exports.handler = async function(event, context) {
    // Verifica se a requisição é do tipo POST
    if (event.httpMethod === 'POST') {
        try {
            // Faz o parse do corpo da requisição
            const data = JSON.parse(event.body);
            const fileBuffer = Buffer.from(data.fileContent, 'base64');

            // Define o caminho do arquivo na "pasta" uploads
            const filePath = `uploads/${data.fileName}`;
            const file = bucket.file(filePath);
            console.log(`Tentando salvar o arquivo: ${filePath}`);

            // Salva o arquivo no bucket
            await file.save(fileBuffer, {
                metadata: { contentType: 'application/pdf' }
            });

            console.log(`Arquivo ${filePath} salvo com sucesso.`);
            // Retorna uma resposta de sucesso
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Upload bem-sucedido!' })
            };
        } catch (error) {
            console.error('Erro ao enviar o arquivo:', error);
            // Retorna uma resposta de erro
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Erro ao enviar o arquivo.' })
            };
        }
    }

    // Retorna uma resposta de método não permitido se não for POST
    return {
        statusCode: 405,
        body: 'Método não permitido'
    };
};
