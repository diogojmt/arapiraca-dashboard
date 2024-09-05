document.addEventListener('DOMContentLoaded', function() {
    // Verifique se o botão de upload existe
    const uploadForm = document.getElementById('uploadForm');
    const processButton = document.getElementById('processButton');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(event) {
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
                            processButton.style.display = 'block';
                        }
                    });
                }
            } else {
                alert('Por favor, selecione um ou mais arquivos.');
            }
        });
    }

    if (processButton) {
        processButton.addEventListener('click', function() {
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
    }
});
