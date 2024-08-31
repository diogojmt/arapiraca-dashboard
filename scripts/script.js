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
        // Aqui você pode implementar o envio do arquivo para o servidor
        alert('Arquivo ' + fileInput.files[0].name + ' enviado com sucesso!');
    } else {
        alert('Por favor, selecione um arquivo.');
    }
});
