document.addEventListener('DOMContentLoaded', function() {
    // Upload de arquivos PDF
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: file.name,
                fileContent: fileContent
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                progressBar.style.width = '100%';
                progressPercentage.textContent = '100% - Concluído!';
                callback(true);
                loadUploadedFiles(); // Atualizar a lista de arquivos carregados
            } else {
                throw new Error('Falha no upload');
            }
        })
        .catch(error => {
            console.error('Erro no upload:', error);
            progressPercentage.textContent = 'Erro no upload';
            progressBar.style.backgroundColor = 'red';
            callback(false);
        });
    };

    reader.readAsDataURL(file);

    // Simular progresso de upload
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

// Atualizar resumo do upload
function updateSummary(successfulUploads, failedUploads, totalFiles) {
    var summary = document.getElementById('summary');
    summary.innerHTML = `
        <strong>Resumo:</strong><br>
        Total de Arquivos: ${totalFiles}<br>
        Sucesso: ${successfulUploads}<br>
        Falhas: ${failedUploads}
    `;
}

// Carregar arquivos existentes
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
            uploadedFilesTable.innerHTML = '';
            data.files.forEach(file => {
                let fileName = file.name.split('/').pop();
                let fileExtension = fileName.split('.').pop();
                let fileSize = (file.size / 1024).toFixed(2) + ' KB';
                let row = `<tr><td>${fileName}</td><td>${fileExtension}</td><td>${fileSize}</td></tr>`;
                uploadedFilesTable.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Erro ao carregar arquivos:', error);
            alert('Erro ao carregar arquivos.');
        });
}

// Processamento de PDFs
document.getElementById('processButton').addEventListener('click', function() {
    console.log("Processando PDFs do Firebase...");

    fetch('/.netlify/functions/process-pdfs', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro no processamento dos PDFs: ' + response.status);
            }
            return response.text();  // Continuar com a resposta em texto
        })
        .then(data => {
            console.log('Resposta do servidor:', data);
            try {
                const jsonData = JSON.parse(data);  // Tentar fazer o parse para JSON
                alert(jsonData.message);
                if (jsonData.message.includes('concluído')) {
                    document.getElementById('downloadCsvButton').style.display = 'block';  // Mostrar botão de download se o processamento for bem-sucedido
                    loadIndicatorsAndChart();  // Carregar e exibir indicadores e gráficos
                }
            } catch (error) {
                console.error('Erro ao processar a resposta JSON:', error);
                alert('Erro ao processar os PDFs.');
            }
        })
        .catch(error => {
            console.error('Erro no processamento:', error);
            alert('Erro ao processar os PDFs.');
        });
});

// Exibir o CSV processado e baixar
document.getElementById('downloadCsvButton').addEventListener('click', function() {
    const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/arrecadacao-arapiraca.appspot.com/o/dados.csv?alt=media';
    fetch(storageUrl)
        .then(response => response.text())
        .then(csvText => {
            const csvData = parseCSV(csvText);
            displayCSVData(csvData);
            document.getElementById('csvDataContainer').style.display = 'block';
            loadIndicatorsAndChart(csvData);
        })
        .catch(error => {
            console.error('Erro ao baixar o CSV:', error);
            alert('Erro ao baixar o CSV.');
        });
});

// Parse CSV
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

// Exibir dados CSV
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

// Função para carregar indicadores e exibir gráfico
function loadIndicatorsAndChart(csvData) {
    if (!csvData) {
        fetch('/api/fetch-dados')
            .then(response => response.text())
            .then(csvText => {
                csvData = parseCSV(csvText);
                showIndicators(csvData);
                displayChart(csvData);
            })
            .catch(error => {
                console.error('Erro ao carregar o arquivo:', error);
                alert('Erro ao carregar o arquivo CSV.');
            });
    } else {
        showIndicators(csvData);
        displayChart(csvData);
    }
}

// Funções de indicadores e gráficos...
