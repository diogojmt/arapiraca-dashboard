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
                if (data && data.length > 0) {
                    allData.push(...data);
                }
            }

            if (allData.length === 0) {
                throw new Error('Nenhum dado válido encontrado nos PDFs.');
            }

            await writeCsv(allData);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Processamento concluído e dados.csv gerado com sucesso!' })
            };
        } catch (error) {
            console.error('Erro durante o processamento:', error);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: error.message || 'Erro durante o processamento dos PDFs.' })
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Método não permitido' })
    };
};

async function processPdf(file) {
    const tempFilePath = path.join('/tmp', file.name); // Salvando diretamente no diretório temporário sem "uploads/"
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
        if (line.includes('Data de Movimento')) {
            const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/g);
            if (dateMatch && dateMatch.length > 0) {
                const [, endDate] = dateMatch;
                const [endDay, endMonth, endYear] = endDate.split('/');
                mesAno = `${endMonth}/${endYear}`;
            }
        }

        const match = line.match(/^(\d+)\s+([A-Z\s]+)\s+([\d,]+\.\d{2})$/);
        if (match) {
            const [_, codigo, descricao, total] = match;
            data.push({
                codigo,
                descricao: descricao.trim(),
                total: total.replace('.', '').replace(',', '.'),
                mesAno
            });
        }
    });

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
