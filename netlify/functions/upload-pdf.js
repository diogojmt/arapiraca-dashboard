const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

// Carrega as credenciais a partir da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'arrecadacao-arapiraca.appspot.com'
});

const bucket = admin.storage().bucket();

// Função serverless exportada
exports.handler = async function(event, context) {
    if (event.httpMethod === 'POST') {
        try {
            const [files] = await bucket.getFiles({ prefix: 'uploads/' });

            const allData = [];
            for (const file of files) {
                const data = await processPdf(file);
                if (data) {
                    allData.push(...data);
                }
            }

            await writeCsv(allData);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Processamento concluído e dados.csv gerado com sucesso!' })
            };
        } catch (error) {
            console.error('Erro durante o processamento:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Erro durante o processamento dos PDFs.' })
            };
        }
    }

    return {
        statusCode: 405,
        body: 'Método não permitido'
    };
};

// Função para processar um PDF individual
async function processPdf(file) {
    const tempFilePath = path.join('/tmp', file.name);
    await file.download({ destination: tempFilePath });

    const dataBuffer = fs.readFileSync(tempFilePath);
    const data = await pdfParse(dataBuffer);

    const parsedData = extractData(data.text);
    return parsedData;
}

// Função para extrair os dados necessários do texto do PDF
function extractData(text) {
    const lines = text.split('\n');
    const data = [];
    let mesAno = '';

    lines.forEach(line => {
        // Identificar a Data de Movimento
        if (line.includes('Data de Movimento')) {
            const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/g);
            if (dateMatch && dateMatch.length > 0) {
                const [, endDate] = dateMatch;
                const [endDay, endMonth, endYear] = endDate.split('/');
                mesAno = `${endMonth}/${endYear}`;
            }
        }

        // Extração das colunas relevantes
        const match = line.match(/^(\d+)\s+(.+?)\s+([\d,]+\.\d{2})$/);
        if (match) {
            const [_, codigo, descricao, total] = match;
            data.push({
                codigo,
                descricao,
                total: total.replace('.', '').replace(',', '.'),
                mesAno
            });
        }
    });

    return data;
}

// Função para escrever os dados extraídos no CSV
async function writeCsv(data) {
    const csvFilePath = path.join('/tmp', 'dados.csv');
    const writer = csvWriter({
        path: csvFilePath,
        header: [
            { id: 'codigo', title: 'Código' },
            { id: 'descricao', title: 'Descrição do código tributário' },
            { id: 'total', title: 'Total' },
            { id: 'mesAno', title: 'Mês/Ano' }
        ]
    });

    await writer.writeRecords(data);

    // Fazer upload do CSV para o Firebase Storage
    await bucket.upload(csvFilePath, { destination: 'dados.csv' });
}
