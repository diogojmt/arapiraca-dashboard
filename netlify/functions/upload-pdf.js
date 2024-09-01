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

// Função para upload de PDFs
exports.handler = async function(event, context) {
    if (event.httpMethod === 'POST') {
        try {
            // Faz o parse do corpo da requisição
            const data = JSON.parse(event.body);
            const fileBuffer = Buffer.from(data.fileContent, 'base64');
            const fileName = `uploads/${data.fileName}`;

            // Cria um arquivo no bucket com o nome fornecido
            const file = bucket.file(fileName);
            console.log(`Tentando salvar o arquivo: ${fileName}`);

            // Salva o arquivo no bucket
            await file.save(fileBuffer, {
                metadata: { contentType: 'application/pdf' }
            });

            console.log(`Arquivo ${fileName} salvo com sucesso.`);
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
        body: JSON.stringify({ message: 'Método não permitido' })
    };
};

// Função serverless para processar os PDFs e gerar o CSV
exports.processPdfs = async function(event, context) {
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

function extractData(text, mesAno) {
    const lines = text.split('\n');
    const data = [];

    console.log("Iniciando o processamento das linhas...");

    lines.forEach(line => {
        console.log("Processando linha:", line);

        // Nova expressão regular para capturar o código, descrição e total
        const match = line.match(/^(\d+)([A-Z\s]+)([\d.,]+\d{2})$/);
        if (match) {
            const [_, codigo, descricao, total] = match;
            console.log("Dados capturados - Código:", codigo, "Descrição:", descricao.trim(), "Total:", total);

            data.push({
                codigo: codigo.trim(),
                descricao: descricao.trim(),
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
