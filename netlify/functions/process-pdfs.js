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
            console.log("Iniciando processamento dos PDFs...");
            const [files] = await bucket.getFiles({ prefix: 'uploads/' });

            if (files.length === 0) {
                console.error("Nenhum arquivo encontrado na pasta 'uploads/'");
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Nenhum arquivo encontrado para processar.' })
                };
            }

            const allData = [];
            for (const file of files) {
                console.log(`Processando arquivo: ${file.name}`);
                const data = await processPdf(file);
                if (data) {
                    allData.push(...data);
                } else {
                    console.error(`Nenhum dado extraído do arquivo: ${file.name}`);
                }
            }

            if (allData.length > 0) {
                await writeCsv(allData);
                console.log("Processamento concluído com sucesso!");
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Processamento concluído e dados.csv gerado com sucesso!' })
                };
            } else {
                console.error("Nenhum dado foi extraído de todos os arquivos.");
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Nenhum dado válido encontrado nos PDFs.' })
                };
            }
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
    try {
        const tempFilePath = path.join('/tmp', file.name);
        console.log(`Baixando arquivo temporário para: ${tempFilePath}`);
        await file.download({ destination: tempFilePath });

        const dataBuffer = fs.readFileSync(tempFilePath);
        const data = await pdfParse(dataBuffer);

        console.log(`Arquivo processado: ${file.name}`);
        const parsedData = extractData(data.text);
        return parsedData;
    } catch (error) {
        console.error(`Erro ao processar o arquivo ${file.name}:`, error);
        return null;
    }
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
                console.log(`Data de Movimento identificada: ${mesAno}`);
            }
        }

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

async function writeCsv(data) {
    try {
        const csvFilePath = path.join('/tmp', 'dados.csv');
        console.log(`Escrevendo dados no CSV em: ${csvFilePath}`);
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
        console.log("CSV gerado com sucesso.");

        const csvFile = bucket.file('dados.csv');
        await csvFile.save(fs.readFileSync(csvFilePath), {
            metadata: { contentType: 'text/csv' }
        });
        console.log("CSV salvo no bucket.");
    } catch (error) {
        console.error("Erro ao gerar ou salvar o CSV:", error);
        throw error;
    }
}
