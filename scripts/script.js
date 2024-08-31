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
    var fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (files.length > 0) {
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

            uploadFile(file, progressBar, listItem.querySelector('.progress-percentage'));
        }
    } else {
        alert('Por favor, selecione um ou mais arquivos.');
    }
});

function uploadFile(file, progressBar, progressPercentage) {
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
        })
        .catch(error => {
            console.error('Erro:', error);
            progressPercentage.textContent = 'Erro no upload';
            progressBar.style.backgroundColor = 'red';
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
