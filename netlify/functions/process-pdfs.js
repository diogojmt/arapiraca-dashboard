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

            if (allData.length === 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Nenhum dado válido encontrado nos PDFs.' })
                };
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
        body: JSON.stringify({ message: 'Método não permitido' })
    };
};

async function processPdf(file) {
    const tempFilePath = path.join('/tmp', file.name.split('/').pop());
    await file.download({ destination: tempFilePath });

    const dataBuffer = fs.readFileSync(tempFilePath);
    const data = await pdfParse(dataBuffer);

    const parsedData = extractData(data.text);
    return parsedData;
}

function extractData(text) {
    const lines = text.split('\n');
    const data = [];
    let mesAno = '';

    lines.forEach(line => {
        console.log("Processando linha:", line);

        // Captura a Data de Movimento no formato "01/01/2019 a 31/01/2019"
        if (line.includes('Data de Movimento:')) {
            const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4}) a \d{2}\/\d{2}\/\d{4}/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch;
                mesAno = `${month}/${year}`;
                console.log("Mês/Ano capturado:", mesAno);
            }
        }

        // Expressão regular para capturar o código, descrição e total
        const match = line.match(/^(\d+)\s+(.+?)\s+([\d.,]+\d{2})$/);
        if (match) {
            const [_, codigo, descricao, total] = match;
            console.log("Dados capturados - Código:", codigo, "Descrição:", descricao, "Total:", total);

            data.push({
                codigo,
                descricao,
                total: total.replace('.', '').replace(',', '.'),
                mesAno
            });
        } else {
            console.log("Linha não corresponde à expressão regular:", line);
        }
    });

    console.log("Dados extraídos:", data);
    return data;
}

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

    const csvFile = bucket.file('dados.csv');
    await csvFile.save(fs.readFileSync(csvFilePath), {
        metadata: { contentType: 'text/csv' }
    });
}
