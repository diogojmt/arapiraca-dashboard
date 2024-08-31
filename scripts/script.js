document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    // Simulação de login (apenas para fins de exemplo)
    if (username === 'admin' && password === '1234') {
        document.querySelector('.login-container').style.display = 'none';
        document.querySelector('.upload-container').style.display = 'block';
    } else {
        alert('Credenciais inválidas!');
    }
});

document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var files = document.getElementById('fileInput').files;
    
    if (files.length > 0) {
        document.getElementById('progressWrapper').style.display = 'block';
        var totalFiles = files.length;
        var uploadedFiles = 0;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            uploadFile(file, totalFiles, (progress) => {
                uploadedFiles++;
                updateProgressBar((uploadedFiles / totalFiles) * 100);
            });
        }
    } else {
        alert('Por favor, selecione um ou mais arquivos.');
    }
});

function uploadFile(file, totalFiles, onProgress) {
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
            onProgress();
            document.getElementById('uploadStatus').textContent = `Arquivo ${file.name} enviado com sucesso!`;
        })
        .catch(error => console.error('Erro:', error));
    };
    reader.readAsDataURL(file);
}

function updateProgressBar(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    if (percentage === 100) {
        document.getElementById('uploadStatus').textContent = 'Todos os arquivos foram enviados!';
    }
}
