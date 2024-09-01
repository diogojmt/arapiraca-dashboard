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

    // Extração do Mês/Ano a partir do nome do arquivo
    const fileName = file.name.split('/').pop();
    const fileDateMatch = fileName.match(/(\d{2})(\d{4})/); // Espera um nome no formato MMYYYY
    let mesAno = '';

    if (fileDateMatch) {
        const [, month, year] = fileDateMatch;
        mesAno = `${month}/${year}`;
        console.log("Mês/Ano capturado a partir do nome do arquivo:", mesAno);
    } else {
        console.log("Não foi possível capturar a data de movimento do nome do arquivo.");
    }

    const parsedData = extractData(data.text, mesAno);
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

        // Ajuste para capturar os valores corretamente
        const match = line.match(/^(\d+)\s+(.+?)\s+([\d,.]+)$/);
        if (match) {
            let [_, codigo, descricao, total] = match;
            // Remover pontos dos valores e substituir o ponto decimal por vírgula
            total = total.replace(/\./g, '').replace(',', '.');
            total = parseFloat(total).toFixed(2).replace('.', ',');

            data.push({
                codigo,
                descricao,
                total,
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
        ],
        fieldDelimiter: '|'
    });

    await writer.writeRecords(data);

    const csvFile = bucket.file('dados.csv');
    await csvFile.save(fs.readFileSync(csvFilePath), {
        metadata: { contentType: 'text/csv' }
    });
}
