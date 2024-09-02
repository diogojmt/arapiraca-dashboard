document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    // Simulação de login (apenas para fins de exemplo)
    if (username === 'admin' && password === '1234') {
        document.querySelector('.login-container').style.display = 'none';
        document.querySelector('.upload-container').style.display = 'block';

        // Carregar e exibir arquivos existentes na pasta uploads
        loadUploadedFiles();
    } else {
        alert('Credenciais inválidas!');
    }
});

document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var files = document.getElementById('fileInput').files;
    var fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    var totalFiles = files.length;
    var successfulUploads = 0;
    var failedUploads = 0;

    if (totalFiles > 0) {
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let listItem = document.createElement('tr');
            listItem.innerHTML = `<td>${file.name}</td><td><span class="progress-percentage">0%</span></td>`;
            let progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            let progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressContainer.appendChild(progressBar);
            listItem.querySelector('td:last-child').appendChild(progressContainer);
            fileList.appendChild(listItem);

            uploadFile(file, progressBar, listItem.querySelector('.progress-percentage'), function(success) {
                if (success) {
                    successfulUploads++;
                } else {
                    failedUploads++;
                }
                updateSummary(successfulUploads, failedUploads, totalFiles);
                
                // Mostrar botão de processamento se houver uploads bem-sucedidos
                if (successfulUploads > 0) {
                    document.getElementById('processButton').style.display = 'block';
                }
            });
        }
    } else {
        alert('Por favor, selecione um ou mais arquivos.');
    }
});

function uploadFile(file, progressBar, progressPercentage, callback) {
    var reader = new FileReader();
    reader.onload = function(event) {
        var fileContent = event.target.result.split(',')[1];

        fetch('/.netlify/functions/upload-pdf', {
            method: 'POST',
            body: JSON.stringify({
                fileName: file.name,
                fileContent: fileContent
            })
        })
        .then(response => response.json())
        .then(data => {
            progressBar.style.width = '100%';
            progressPercentage.textContent = '100% - Concluído!';
            callback(true);

            // Atualizar a lista de arquivos carregados
            loadUploadedFiles();
        })
        .catch(error => {
            console.error('Erro:', error);
            progressPercentage.textContent = 'Erro no upload';
            progressBar.style.backgroundColor = 'red';
            callback(false);
        });
    };

    reader.readAsDataURL(file);

    // Simular progresso
    let progress = 0;
    let interval = setInterval(() => {
        if (progress < 100) {
            progress += 10;
            progressBar.style.width = progress + '%';
            progressPercentage.textContent = progress + '%';
        } else {
            clearInterval(interval);
        }
    }, 100);
}

function updateSummary(successfulUploads, failedUploads, totalFiles) {
    var summary = document.getElementById('summary');
    summary.innerHTML = `
        <strong>Resumo:</strong><br>
        Total de Arquivos: ${totalFiles}<br>
        Sucesso: ${successfulUploads}<br>
        Falhas: ${failedUploads}
    `;
}

function loadUploadedFiles() {
    fetch('/.netlify/functions/list-uploads', { method: 'GET' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar os arquivos: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            var uploadedFilesTable = document.getElementById('uploadedFiles');
            if (uploadedFilesTable) {
                uploadedFilesTable.innerHTML = ''; // Limpa a tabela antes de adicionar os arquivos
                data.files.forEach(file => {
                    let fileName = file.name.split('/').pop(); // Obtém apenas o nome do arquivo
                    let fileExtension = fileName.split('.').pop(); // Obtém a extensão do arquivo
                    let fileSize = (file.size / 1024).toFixed(2) + ' KB'; // Converte o tamanho para KB

                    let row = `
                        <tr>
                            <td>${fileName}</td>
                            <td>${fileExtension}</td>
                            <td>${fileSize}</td>
                        </tr>`;
                    uploadedFilesTable.innerHTML += row;
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar arquivos:', error);
            alert('Erro ao carregar arquivos existentes.');
        });
}

document.getElementById('processButton').addEventListener('click', function() {
    fetch('/.netlify/functions/process-pdfs', { method: 'POST' })
        .then(response => response.text())  // Mudei para .text() para ver a resposta como string
        .then(data => {
            console.log('Resposta do servidor:', data);
            try {
                const jsonData = JSON.parse(data);  // Tenta fazer o parse
                alert(jsonData.message);
                if (jsonData.message.includes('concluído')) {
                    document.getElementById('downloadCsvButton').style.display = 'block';
                    loadIndicatorsAndChart(); // Carregar e exibir indicadores e gráficos
                }
            } catch (error) {
                console.error('Erro ao fazer o parse do JSON:', error);
                alert('Erro ao processar os PDFs.');
            }
        })
        .catch(error => {
            console.error('Erro no processamento:', error);
            alert('Erro ao processar os PDFs.');
        });
});

// Função para o botão "Baixar dados.csv"
document.getElementById('downloadCsvButton').addEventListener('click', function() {
    // URL direta para o arquivo no Firebase Storage
    const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/arrecadacao-arapiraca.appspot.com/o/dados.csv?alt=media';

    fetch(storageUrl)
    .then(response => response.text())
    .then(csvText => {
        const csvData = parseCSV(csvText);
        displayCSVData(csvData);
        document.getElementById('csvDataContainer').style.display = 'block';
        loadIndicatorsAndChart(csvData); // Carregar e exibir indicadores e gráficos
    })
    .catch(error => {
        console.error('Erro ao baixar o arquivo:', error);
        alert('Erro ao baixar o arquivo CSV.');
    });
});

// Função para carregar indicadores e exibir gráfico
function loadIndicatorsAndChart(csvData) {
    if (!csvData) {
        fetch('/api/fetch-dados')
            .then(response => response.text())
            .then(csvText => {
                csvData = parseCSV(csvText);
                showIndicators(csvData);
                displayChart(csvData);
                document.getElementById('indicatorsContainer').style.display = 'block';
            })
            .catch(error => {
                console.error('Erro ao carregar o arquivo:', error);
                alert('Erro ao carregar o arquivo CSV.');
            });
    } else {
        showIndicators(csvData);
        displayChart(csvData);
        document.getElementById('indicatorsContainer').style.display = 'block';
    }
}

function showIndicators(data) {
    const totalGeral = calculateTotalGeral(data);
    const quantidadeRegistros = data.length;
    const mesAnoRecente = calculateMesAnoRecente(data);
    const mediaPorMes = calculateMediaPorMes(data);
    const codigoMaisComum = calculateCodigoMaisComum(data);

    document.getElementById('totalGeral').textContent = `Total Geral: R$ ${totalGeral}`;
    document.getElementById('quantidadeRegistros').textContent = `Quantidade de Registros: ${quantidadeRegistros}`;
    // Outros indicadores podem ser adicionados aqui
}

function calculateTotalGeral(data) {
    return data.reduce((sum, row) => sum + parseFloat(row['Total'].replace(',', '.')), 0).toFixed(2).replace('.', ',');
}

function calculateMesAnoRecente(data) {
    const meses = data.map(row => row['Mês/Ano']);
    return meses.sort().reverse()[0];
}

function calculateMediaPorMes(data) {
    const meses = data.reduce((acc, row) => {
        acc[row['Mês/Ano']] = (acc[row['Mês/Ano']] || 0) + parseFloat(row['Total'].replace(',', '.'));
        return acc;
    }, {});
    const totalMeses = Object.keys(meses).length;
    const totalGeral = Object.values(meses).reduce((sum, value) => sum + value, 0);
    return (totalGeral / totalMeses).toFixed(2).replace('.', ',');
}

function calculateCodigoMaisComum(data) {
    const codigos = data.map(row => row['Código']);
    const freqMap = codigos.reduce((acc, codigo) => {
        acc[codigo] = (acc[codigo] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(freqMap).reduce((a, b) => (freqMap[a] > freqMap[b] ? a : b));
}

function displayChart(data) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item['Mês/Ano']), // Supondo que você tenha um campo 'Mês/Ano'
            datasets: [{
                label: 'Arrecadação',
                data: data.map(item => parseFloat(item['Total'].replace(',', '.'))),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';');
    const data = lines.slice(1).map(line => {
        const values = line.split(';');
        const entry = {};
        headers.forEach((header, index) => {
            entry[header.trim()] = values[index].trim();
        });
        return entry;
    });
    return data;
}

function displayCSVData(csvData) {
    const csvDataBody = document.getElementById('csvDataBody');
    csvDataBody.innerHTML = '';

    csvData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['Código']}</td>
            <td>${row['Descrição do código tributário']}</td>
            <td>${row['Total']}</td>
            <td>${row['Mês/Ano']}</td>
        `;
        csvDataBody.appendChild(tr);
    });
}

// Função para o botão "Exibir Dados.csv"
document.getElementById('showCsvButton').addEventListener('click', function() {
    // URL do proxy no Netlify
    const proxyUrl = '/api/fetch-dados';

    fetch(proxyUrl)
    .then(response => {
        if (response.ok) {
            return response.text(); // Retorna o conteúdo do arquivo
        } else {
            throw new Error('Erro ao carregar o arquivo');
        }
    })
    .then(csvText => {
        const csvData = parseCSV(csvText);
        displayCSVData(csvData);
        document.getElementById('csvDataContainer').style.display = 'block';
        loadIndicatorsAndChart(csvData); // Carregar e exibir indicadores e gráficos
    })
    .catch(error => {
        console.error('Erro ao carregar o arquivo:', error);
        alert('Erro ao carregar o arquivo CSV.');
    });
});
