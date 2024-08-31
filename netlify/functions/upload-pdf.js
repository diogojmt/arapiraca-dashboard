const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);
        const filePath = path.join('/tmp', data.fileName);

        // Salva o arquivo no sistema temporário do Netlify
        fs.writeFileSync(filePath, data.fileContent, 'base64');

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
