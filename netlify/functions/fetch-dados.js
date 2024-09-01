const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const url = 'https://firebasestorage.googleapis.com/v0/b/arrecadacao-arapiraca.appspot.com/o/dados.csv?alt=media';
  
  try {
    const response = await fetch(url);
    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*'
      },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: 'Erro ao buscar o arquivo dados.csv'
    };
  }
};
