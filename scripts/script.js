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
                loadUploadedFiles();
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
    fetch('/.netlify/functions/process-pdfs', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro no processamento dos PDFs: ' + response.status);
            }
            return response.text();
        })
        .then(data => {
            try {
                const jsonData = JSON.parse(data);
                alert(jsonData.message);
                if (jsonData.message.includes('concluído')) {
                    document.getElementById('downloadCsvButton').style.display = 'block';
                    loadIndicatorsAndChart();
                }
            } catch (error) {
                console.error('Erro no JSON:', error);
                alert('Erro ao processar PDFs.');
            }
        })
        .catch(error => {
            console.error('Erro no processamento:', error);
            alert('Erro ao processar PDFs.');
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
