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
            let listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${file.name}</strong> <span class="progress-percentage">0%</span>`;
            let progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            let progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressContainer.appendChild(progressBar);
            listItem.appendChild(progressContainer);
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
            return response.text(); // Mudança para text()
        })
        .then(data => {
            try {
                const jsonData = JSON.parse(data); // Tentar fazer o parse para JSON
                var uploadedFilesContainer = document.getElementById('uploadedFiles');
                uploadedFilesContainer.innerHTML = '<h3>Arquivos Carregados:</h3><ul>';
                jsonData.files.forEach(file => {
                    uploadedFilesContainer.innerHTML += `<li>${file}</li>`;
                });
                uploadedFilesContainer.innerHTML += '</ul>';
            } catch (error) {
                console.error('Erro ao fazer o parse do JSON:', error);
                alert('Erro ao carregar arquivos. Resposta inesperada do servidor.');
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
