document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Simulação de login (apenas para fins de exemplo)
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    
    if(username === 'admin' && password === '1234') {
        document.querySelector('.login-container').style.display = 'none';
        document.querySelector('.upload-container').style.display = 'block';
    } else {
        alert('Credenciais inválidas!');
    }
});

document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var fileInput = document.getElementById('fileInput');
    if(fileInput.files.length > 0) {
        var reader = new FileReader();

        reader.onloadend = function() {
            var fileContent = reader.result.split(',')[1];  // Obtém o conteúdo base64

            fetch('/.netlify/functions/upload-pdf', {
                method: 'POST',
                body: JSON.stringify({
                    fileName: fileInput.files[0].name,
                    fileContent: fileContent
                }),
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
            })
            .catch(error => {
                console.error('Erro:', error);
            });
        };

        reader.readAsDataURL(fileInput.files[0]);  // Converte o arquivo para base64
    } else {
        alert('Por favor, selecione um arquivo.');
    }
});
