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
    })
    .catch(error => {
        console.error('Erro ao baixar o arquivo:', error);
        alert('Erro ao baixar o arquivo CSV.');
    });
});

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





